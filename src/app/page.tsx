import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Bayón Middleware</h1>
        <p className="mt-2 text-muted-foreground">
          MCP intermediary for the Telas Bayón product search. Admin panel coming soon.
        </p>
      </div>
      <Button asChild>
        <a href="/login">Acceder al panel</a>
      </Button>
    </main>
  );
}
