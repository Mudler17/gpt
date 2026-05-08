import React, { useEffect } from "react";
import App30 from "./App30.jsx";

const ENABLE_PHASES20_DOM_INJECTION =
  import.meta.env.VITE_ENABLE_PHASES20_DOM_INJECTION === "true";

export default function App31() {
  useEffect(() => {
    if (!ENABLE_PHASES20_DOM_INJECTION) return undefined;

    console.warn(
      "App31 Phasen-2.0-DOM-Injektion ist in App 3.1.2 deaktiviert. " +
        "Bitte die native React-Phasenlogik aus App19/NativePhases verwenden."
    );

    return undefined;
  }, []);

  return <App30 />;
}
