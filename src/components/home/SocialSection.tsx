import { motion } from "framer-motion";
import instagramIcon from "@/assets/instagram-icon.png";
import snapchatIcon from "@/assets/snapchat-icon.png";

const SocialSection = () => (
  <section className="py-16">
    <div className="container mx-auto px-4 text-center max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
          Join the Movement Beyond the App
        </h2>
        <p className="text-white/50 mb-10 leading-relaxed">
          Stay connected with the Uprising community outside the platform. Follow us on social media for daily encouragement, updates, and stories from the community.
        </p>

        <div className="flex justify-center gap-10 mb-8">
          <a
            href="https://www.instagram.com/p/DVMXGIfDHo6/?igsh=eGM1dmV1emwzdzB4"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-3"
          >
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_30px_-5px_hsl(155_60%_38%/0.5)] border border-white/15"
              style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))" }}
            >
              <img src={instagramIcon} alt="Instagram" className="w-11 h-11 object-contain" />
            </div>
            <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">Instagram</span>
          </a>

          <a
            href="https://story.snapchat.com/u/the_uprising26?share_id=3fz0ORNnS76sy1nkSfPYaw&locale=en_NG"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-3"
          >
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_30px_-5px_hsl(155_60%_38%/0.5)] border border-white/15"
              style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))" }}
            >
              <img src={snapchatIcon} alt="Snapchat" className="w-11 h-11 object-contain" />
            </div>
            <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">Snapchat</span>
          </a>
        </div>

        <p className="text-white/50 text-sm">
          Tag us and share your story with the community 💚
        </p>
      </motion.div>
    </div>
  </section>
);

export default SocialSection;
