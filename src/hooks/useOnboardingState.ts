import { useState, useEffect } from "react";
import { MachineProfile } from "../components/OnboardingChat";

const ONBOARDING_KEY = "gopilot_onboarding_complete";
const MACHINE_PROFILE_KEY = "gopilot_machine_profile";

export function useOnboardingState() {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [machineProfile, setMachineProfile] = useState<MachineProfile | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ONBOARDING_KEY);
      const storedProfile = localStorage.getItem(MACHINE_PROFILE_KEY);

      if (stored === "true") {
        setIsOnboardingComplete(true);
      }

      if (storedProfile) {
        setMachineProfile(JSON.parse(storedProfile));
      }
    } catch (error) {
      console.error("Error loading onboarding state:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const completeOnboarding = (profile: MachineProfile) => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    localStorage.setItem(MACHINE_PROFILE_KEY, JSON.stringify(profile));
    setIsOnboardingComplete(true);
    setMachineProfile(profile);
  };

  const skipOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setIsOnboardingComplete(true);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    localStorage.removeItem(MACHINE_PROFILE_KEY);
    setIsOnboardingComplete(false);
    setMachineProfile(null);
  };

  const updateMachineProfile = (profile: Partial<MachineProfile>) => {
    const updated = { ...machineProfile, ...profile } as MachineProfile;
    localStorage.setItem(MACHINE_PROFILE_KEY, JSON.stringify(updated));
    setMachineProfile(updated);
  };

  return {
    isOnboardingComplete,
    isLoading,
    machineProfile,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    updateMachineProfile,
  };
}
