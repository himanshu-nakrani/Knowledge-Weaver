import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import Documents from "@/pages/Documents";
import Flashcards from "@/pages/Flashcards";
import Eval from "@/pages/Eval";
import Settings from "@/pages/Settings";
import Trash from "@/pages/Trash";
import KnowledgeGraph from "@/pages/KnowledgeGraph";
import Agent from "@/pages/Agent";
import SharedDocument from "@/pages/SharedDocument";
import Analytics from "@/pages/Analytics";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/workspace" component={Home} />
      <Route path="/documents" component={Documents} />
      <Route path="/flashcards" component={Flashcards} />
      <Route path="/eval" component={Eval} />
      <Route path="/settings" component={Settings} />
      <Route path="/trash" component={Trash} />
      <Route path="/knowledge-graph" component={KnowledgeGraph} />
      <Route path="/agent" component={Agent} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/share/:token" component={SharedDocument} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
