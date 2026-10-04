import { useEffect } from "react";
import { audio } from "./game/audio";
import { stageTemplateById, useStore } from "./game/store";
import { HowToScreen, OptionsScreen, ResultScreen, StageSelectScreen, TitleScreen } from "./screens/Menus";
import { PlayScreen } from "./screens/Play";
import { TutorialScreen } from "./screens/Tutorial";

export default function App() {
  const screen = useStore((s) => s.screen);
  const selectedStageId = useStore((s) => s.selectedStageId);
  const setScreen = useStore((s) => s.setScreen);

  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const template = stageTemplateById(selectedStageId);

  switch (screen) {
    case "tutorial":
      return <TutorialScreen />;
    case "select":
      return <StageSelectScreen />;
    case "play":
      return (
        <PlayScreen
          key={selectedStageId}
          template={template}
          isTutorial={template.id === "tutorial"}
          onExit={() => setScreen(template.id === "tutorial" ? "title" : "select")}
        />
      );
    case "result":
      return <ResultScreen />;
    case "options":
      return <OptionsScreen />;
    case "howto":
      return <HowToScreen />;
    default:
      return <TitleScreen />;
  }
}
