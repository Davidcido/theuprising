import { ImagePlus } from "lucide-react";

interface ProfileCoverPhotoProps {
  coverUrl?: string | null;
  isOwnProfile: boolean;
  onUploadClick: () => void;
}

const ProfileCoverPhoto = ({ coverUrl, isOwnProfile, onUploadClick }: ProfileCoverPhotoProps) => {
  return (
    <div className="relative h-40 sm:h-48 overflow-hidden">
      {coverUrl ? (
        <img
          src={coverUrl}
          alt="Cover"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-r from-primary/30 to-primary/10" />
      )}

      {isOwnProfile && (
        <button
          onClick={onUploadClick}
          className="absolute top-3 right-3 p-2 rounded-xl bg-background/60 backdrop-blur-sm text-foreground hover:bg-background/80 transition-colors"
        >
          <ImagePlus className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default ProfileCoverPhoto;
