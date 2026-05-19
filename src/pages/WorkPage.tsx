import { WorkApp } from "../components/work";
import { useRefactor } from "../context/RefactorContext";

export function WorkPage() {
  const { uiMode, setUiMode } = useRefactor();
  return <WorkApp uiMode={uiMode} setUiMode={setUiMode} />;
}
