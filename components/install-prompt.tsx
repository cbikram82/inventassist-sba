"use client";

import { Button } from "@/components/ui/button";
import { useAddToHomeScreen } from "@/lib/useAddToHomeScreen";
import { Download } from "lucide-react";

export function InstallPrompt() {
  const { isInstallable, promptToInstall } = useAddToHomeScreen();

  if (!isInstallable) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
      <div className="flex items-center gap-4">
        <div>
          <h3 className="font-semibold">Install InventAssist</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Add to your home screen for quick access
          </p>
        </div>
        <Button
          onClick={promptToInstall}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Install
        </Button>
      </div>
    </div>
  );
} 