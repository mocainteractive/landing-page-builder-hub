import Editor from "@/components/Editor";
import { MocaProvider } from "@/components/MocaProvider";

export const metadata = {
  title: "Editor · Moca Hub Landing Page Builder",
};

export default function EditorPage() {
  return (
    <MocaProvider>
      <Editor />
    </MocaProvider>
  );
}
