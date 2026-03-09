import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";

/**
 * Returns the current keyboard height in pixels.
 * On native iOS (Capacitor), uses the Keyboard plugin events.
 * On web, falls back to the visualViewport API.
 */
export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Native: use Capacitor Keyboard plugin which gives actual keyboard height
      const showPromise = Keyboard.addListener("keyboardWillShow", (info) => {
        setKeyboardHeight(info.keyboardHeight);
      });
      const hidePromise = Keyboard.addListener("keyboardWillHide", () => {
        setKeyboardHeight(0);
      });

      return () => {
        showPromise.then((h) => h.remove());
        hidePromise.then((h) => h.remove());
      };
    } else {
      // Web fallback: visualViewport API
      const vv = window.visualViewport;
      if (!vv) return;

      const handleResize = () => {
        const kbHeight = window.innerHeight - vv.height;
        setKeyboardHeight(kbHeight > 50 ? kbHeight : 0);
      };

      vv.addEventListener("resize", handleResize);
      vv.addEventListener("scroll", handleResize);
      return () => {
        vv.removeEventListener("resize", handleResize);
        vv.removeEventListener("scroll", handleResize);
      };
    }
  }, []);

  return keyboardHeight;
}
