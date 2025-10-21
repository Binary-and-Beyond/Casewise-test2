"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { apiService } from "@/lib/api";
import { UserAvatar } from "@/components/ui/user-avatar";

interface ProfileSettingsProps {
  onBack: () => void;
}

export function ProfileSettings({ onBack }: ProfileSettingsProps) {
  const { user, refreshUser } = useAuth();
  const [profileData, setProfileData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    username: "",
    bio: "",
  });

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        username: user.username || "",
        bio: user.bio || "",
      });
      if (user.profile_image_url) {
        setImagePreview(user.profile_image_url);
      }
    }
  }, [user]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setProfileImage(null);
    setImagePreview(null);
  };

  const handleInputChange = (field: string, value: string) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePasswordSubmit = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({
        type: "error",
        text: "New passwords do not match",
      });
      return;
    }

    if (passwordData.new_password.length < 6) {
      setMessage({
        type: "error",
        text: "New password must be at least 6 characters long",
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await apiService.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });

      setMessage({
        type: "success",
        text: "Password changed successfully",
      });

      // Clear password fields
      setPasswordData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to change password",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      // Upload profile image first if there's a new one
      if (profileImage) {
        await apiService.uploadProfileImage(profileImage);
      }

      // Update profile data
      await apiService.updateProfile(profileData);

      // Refresh user data
      await refreshUser();

      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (error: any) {
      console.error("Profile update error:", error);
      setMessage({
        type: "error",
        text: error.message || "Failed to update profile. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Complete Profile
        </h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-8">
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Profile Photo Section */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Profile Photo
            </h2>
            <div className="flex items-start space-x-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <UserAvatar
                  src={imagePreview || undefined}
                  alt="Profile preview"
                  size={80}
                  fallbackText={
                    user?.full_name?.charAt(0) ||
                    user?.username?.charAt(0) ||
                    "U"
                  }
                />
              </div>

              {/* Upload Section */}
              <div className="flex-1">
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-transparent border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2"
                    onClick={() =>
                      document.getElementById("profile-image-upload")?.click()
                    }
                  >
                    Upload Photo
                  </Button>
                  <input
                    id="profile-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      remove
                    </button>
                  </div>
                </div>
              </div>

              {/* Image Requirements */}
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Image requirements
                </h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>Min. 400 x 400px</li>
                  <li>Max. 2MB</li>
                  <li>Your face or company logo</li>
                </ul>
              </div>
            </div>
          </div>

          {/* User Details Section */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              User Details
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label
                  htmlFor="first_name"
                  className="text-sm font-medium text-gray-700"
                >
                  First Name
                </Label>
                <Input
                  id="first_name"
                  type="text"
                  placeholder="First Name"
                  value={profileData.first_name}
                  onChange={(e) =>
                    handleInputChange("first_name", e.target.value)
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label
                  htmlFor="last_name"
                  className="text-sm font-medium text-gray-700"
                >
                  Last Name
                </Label>
                <Input
                  id="last_name"
                  type="text"
                  placeholder="Last Name"
                  value={profileData.last_name}
                  onChange={(e) =>
                    handleInputChange("last_name", e.target.value)
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={profileData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label
                  htmlFor="username"
                  className="text-sm font-medium text-gray-700"
                >
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Username"
                  value={profileData.username}
                  onChange={(e) =>
                    handleInputChange("username", e.target.value)
                  }
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <Label
                  htmlFor="bio"
                  className="text-sm font-medium text-gray-700"
                >
                  Bio
                </Label>
                <textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  value={profileData.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Password Change Section */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Change Password
            </h2>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <Label
                  htmlFor="current_password"
                  className="text-sm font-medium text-gray-700"
                >
                  Current Password
                </Label>
                <Input
                  id="current_password"
                  type="password"
                  placeholder="Enter current password"
                  value={passwordData.current_password}
                  onChange={(e) =>
                    handlePasswordChange("current_password", e.target.value)
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label
                  htmlFor="new_password"
                  className="text-sm font-medium text-gray-700"
                >
                  New Password
                </Label>
                <Input
                  id="new_password"
                  type="password"
                  placeholder="Enter new password"
                  value={passwordData.new_password}
                  onChange={(e) =>
                    handlePasswordChange("new_password", e.target.value)
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label
                  htmlFor="confirm_password"
                  className="text-sm font-medium text-gray-700"
                >
                  Confirm New Password
                </Label>
                <Input
                  id="confirm_password"
                  type="password"
                  placeholder="Confirm new password"
                  value={passwordData.confirm_password}
                  onChange={(e) =>
                    handlePasswordChange("confirm_password", e.target.value)
                  }
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handlePasswordSubmit}
                  disabled={
                    isLoading ||
                    !passwordData.current_password ||
                    !passwordData.new_password ||
                    !passwordData.confirm_password
                  }
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 disabled:opacity-50"
                >
                  Change Password
                </Button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 disabled:opacity-50"
            >
              {isLoading ? "Updating..." : "Update Profile"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
