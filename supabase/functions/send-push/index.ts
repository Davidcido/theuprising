import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Push crypto utilities using Web Crypto API
async function generateVapidJwt(
  endpoint: string,
  vapidSubject: string,
  vapidPrivateKey: string,
  vapidPublicKey: string
): Promise<{ authorization: string; cryptoKey: string }> {
  const urlObj = new URL(endpoint);
  const audience = `${urlObj.protocol}//${urlObj.host}`;

  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: vapidSubject,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64urlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(encoder.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const privateKeyBytes = base64urlDecode(vapidPrivateKey);
  const publicKeyBytes = base64urlDecode(vapidPublicKey);

  // Build JWK for P-256
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: vapidPrivateKey,
    x: base64urlEncode(publicKeyBytes.slice(1, 33)),
    y: base64urlEncode(publicKeyBytes.slice(33, 65)),
  };

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    encoder.encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format
  const sigBytes = new Uint8Array(signature);
  const token = `${unsignedToken}.${base64urlEncode(sigBytes)}`;

  return {
    authorization: `vapid t=${token}, k=${vapidPublicKey}`,
    cryptoKey: `p256ecdsa=${vapidPublicKey}`,
  };
}

function base64urlEncode(data: Uint8Array): string {
  let str = "";
  for (const byte of data) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

// Encrypt push payload using RFC 8291
async function encryptPayload(
  payload: string,
  subscriptionKeys: { p256dh: string; auth: string }
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const encoder = new TextEncoder();

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKeyRaw = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyRaw);

  // Import subscription public key
  const subPublicKeyBytes = base64urlDecode(subscriptionKeys.p256dh);
  const subPublicKey = await crypto.subtle.importKey(
    "raw",
    subPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subPublicKey },
    localKeyPair.privateKey,
    256
  );

  const authSecret = base64urlDecode(subscriptionKeys.auth);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive PRK
  const ikm = new Uint8Array(sharedSecret);
  const authInfo = encoder.encode("Content-Encoding: auth\0");
  
  const prkKey = await crypto.subtle.importKey("raw", authSecret, { name: "HKDF" }, false, ["deriveBits"]);
  
  // Use simpler key derivation
  const combinedKey = await crypto.subtle.importKey("raw", ikm, { name: "HKDF" }, false, ["deriveBits"]);
  const contentKey = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: salt, info: encoder.encode("Content-Encoding: aes128gcm\0") },
    combinedKey,
    128
  );
  const nonceBytes = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: salt, info: encoder.encode("Content-Encoding: nonce\0") },
    combinedKey,
    96
  );

  // Encrypt with AES-GCM
  const aesKey = await crypto.subtle.importKey("raw", contentKey, { name: "AES-GCM" }, false, ["encrypt"]);
  
  // Add padding delimiter
  const paddedPayload = new Uint8Array([...encoder.encode(payload), 2]);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonceBytes },
    aesKey,
    paddedPayload
  );

  return {
    encrypted: new Uint8Array(encrypted),
    salt,
    localPublicKey,
  };
}

async function sendPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: object,
  vapidSubject: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    const payloadStr = JSON.stringify(payload);
    
    const { encrypted, salt, localPublicKey } = await encryptPayload(payloadStr, subscription.keys);

    // Build aes128gcm body
    const recordSize = 4096;
    const header = new Uint8Array(16 + 4 + 1 + localPublicKey.length);
    header.set(salt, 0);
    new DataView(header.buffer).setUint32(16, recordSize);
    header[20] = localPublicKey.length;
    header.set(localPublicKey, 21);

    const body = new Uint8Array(header.length + encrypted.length);
    body.set(header);
    body.set(encrypted, header.length);

    const vapidHeaders = await generateVapidJwt(
      subscription.endpoint,
      vapidSubject,
      vapidPrivateKey,
      vapidPublicKey
    );

    const resp = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        Authorization: vapidHeaders.authorization,
        TTL: "86400",
        Urgency: "high",
      },
      body: body,
    });

    if (resp.status === 410 || resp.status === 404) {
      // Subscription expired, should be cleaned up
      return false;
    }

    return resp.ok;
  } catch (error) {
    console.error("Push send error:", error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, title, body, url, tag } = await req.json();

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: "user_id, title, and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:hello@uprising.app";

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all push subscriptions for this user using service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No subscriptions found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = { title, body, url: url || "/", tag: tag || "uprising" };
    let sent = 0;
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
      const success = await sendPushNotification(
        { endpoint: sub.endpoint, keys: sub.keys as any },
        payload,
        vapidSubject,
        vapidPublicKey,
        vapidPrivateKey
      );
      if (success) {
        sent++;
      } else {
        expiredEndpoints.push(sub.endpoint);
      }
    }

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user_id)
        .in("endpoint", expiredEndpoints);
    }

    return new Response(
      JSON.stringify({ sent, total: subscriptions.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send push error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
