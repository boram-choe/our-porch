"use client";

import { useState, useEffect } from "react";
import MapInterface from "@/components/MapInterface";
import AuthOnboarding, { loadSavedProfile } from "@/components/AuthOnboarding";
import type { UserProfile } from "@/components/AuthOnboarding";

export default function Home() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [checked, setChecked] = useState(false); // avoid flash on first render

  useEffect(() => {
    const saved = loadSavedProfile();
    if (saved) setUserProfile(saved);
    setChecked(true);
  }, []);

  if (!checked) return null; // prevents hydration mismatch

  if (!userProfile) {
    return <AuthOnboarding onComplete={(profile) => setUserProfile(profile)} />;
  }

  return (
    <main className="w-full h-full">
      <MapInterface
        userProfile={userProfile}
        onProfileUpdate={(updated) => {
          if (!updated) {
            localStorage.removeItem("gongsil_user_profile");
            setUserProfile(null);
          } else {
            setUserProfile(updated);
          }
        }}
      />
    </main>
  );
}
