import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

/**
 * All content in this page are only for example, replace with your own feature implementation
 */
export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <main>
        <Loader2 className="animate-spin" />
        Example Page
        <Button variant="default">Example Button</Button>
      </main>
    </div>
  );
}
