import { AppShell } from "../components/shell/AppShell";
import { RecommendFlow } from "../components/recommend/RecommendFlow";

export default function Home() {
  return (
    <AppShell>
      <RecommendFlow />
    </AppShell>
  );
}
