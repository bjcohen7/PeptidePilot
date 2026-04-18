import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { QuizProvider } from "./contexts/QuizContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import DashboardLayout from "./components/DashboardLayout";
import SessionTracker from "./components/SessionTracker";
import Seo from "./components/Seo";

// Pages
import Home from "./pages/Home";
import QuizEntry from "./pages/QuizEntry";
import QuizFlow from "./pages/QuizFlow";
import Processing from "./pages/Processing";
import Results from "./pages/Results";
import About from "./pages/About";
import Blog from "./pages/Blog";
import { PrivacyPolicy, TermsOfService, MedicalDisclaimer } from "./pages/Legal";
import BlogArticle from "./pages/BlogArticle";
import { FAQPage, PseoDetailPage, PseoHub, PseoSectionPage } from "./pages/PseoPages";
import AffiliatePartnersAdmin from "./pages/admin/AffiliatePartners";
import InsightsOverview from "./pages/admin/InsightsOverview";

// Pages that should NOT show the standard navbar/footer
const BARE_ROUTES = ["/quiz/flow", "/processing"];

function isBareRoute(path: string) {
  return BARE_ROUTES.some((r) => path.startsWith(r));
}

function Layout({ children }: { children: React.ReactNode }) {
  // We use a simple heuristic: quiz/flow and processing pages manage their own headers
  return <>{children}</>;
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function Router() {
  const [location] = useLocation();

  const noindexMeta = (() => {
    if (location === "/quiz") {
      return {
        title: "Quiz",
        description: "Start the PeptidePilot assessment.",
      };
    }

    if (location.startsWith("/quiz/flow")) {
      return {
        title: "Quiz Flow",
        description: "PeptidePilot quiz flow.",
      };
    }

    if (location.startsWith("/processing")) {
      return {
        title: "Processing",
        description: "PeptidePilot is processing your quiz responses.",
      };
    }

    if (location.startsWith("/results")) {
      return {
        title: "Results",
        description: "Personalized PeptidePilot results.",
      };
    }

    if (location.startsWith("/admin")) {
      return {
        title: "Admin",
        description: "PeptidePilot admin workspace.",
      };
    }

    return null;
  })();

  return (
    <>
      {noindexMeta ? (
        <Seo
          title={noindexMeta.title}
          description={noindexMeta.description}
          path={location}
          type="website"
          noindex
        />
      ) : null}
      <Switch>
      {/* Landing page */}
      <Route path="/">
        <PublicLayout>
          <Home />
        </PublicLayout>
      </Route>

      {/* Quiz entry — minimal header, no footer */}
      <Route path="/quiz">
        <QuizEntry />
      </Route>

      {/* Quiz flow — fully self-contained */}
      <Route path="/quiz/flow">
        <QuizFlow />
      </Route>

      {/* Processing screen — no nav */}
      <Route path="/processing">
        <Processing />
      </Route>

      {/* Results — manages its own header */}
      <Route path="/results">
        <Results />
      </Route>

      {/* Supporting pages */}
      <Route path="/about">
        <PublicLayout>
          <About />
        </PublicLayout>
      </Route>

      <Route path="/blog">
        <PublicLayout>
          <Blog />
        </PublicLayout>
      </Route>

      <Route path="/blog/:slug">
        {(params) => (
          <PublicLayout>
            <BlogArticle params={params} />
          </PublicLayout>
        )}
      </Route>

      <Route path="/learn">
        <PublicLayout>
          <PseoHub />
        </PublicLayout>
      </Route>

      <Route path="/peptides">
        <PublicLayout>
          <PseoSectionPage sectionKey="peptides" />
        </PublicLayout>
      </Route>

      <Route path="/peptides/:slug">
        {(params) => (
          <PublicLayout>
            <PseoDetailPage sectionKey="peptides" slug={params.slug} />
          </PublicLayout>
        )}
      </Route>

      <Route path="/goals">
        <PublicLayout>
          <PseoSectionPage sectionKey="goals" />
        </PublicLayout>
      </Route>

      <Route path="/goals/:slug">
        {(params) => (
          <PublicLayout>
            <PseoDetailPage sectionKey="goals" slug={params.slug} />
          </PublicLayout>
        )}
      </Route>

      <Route path="/compare">
        <PublicLayout>
          <PseoSectionPage sectionKey="compare" />
        </PublicLayout>
      </Route>

      <Route path="/compare/:slug">
        {(params) => (
          <PublicLayout>
            <PseoDetailPage sectionKey="compare" slug={params.slug} />
          </PublicLayout>
        )}
      </Route>

      <Route path="/stacks">
        <PublicLayout>
          <PseoSectionPage sectionKey="stacks" />
        </PublicLayout>
      </Route>

      <Route path="/stacks/:slug">
        {(params) => (
          <PublicLayout>
            <PseoDetailPage sectionKey="stacks" slug={params.slug} />
          </PublicLayout>
        )}
      </Route>

      <Route path="/guides">
        <PublicLayout>
          <PseoSectionPage sectionKey="guides" />
        </PublicLayout>
      </Route>

      <Route path="/guides/:slug">
        {(params) => (
          <PublicLayout>
            <PseoDetailPage sectionKey="guides" slug={params.slug} />
          </PublicLayout>
        )}
      </Route>

      <Route path="/for">
        <PublicLayout>
          <PseoSectionPage sectionKey="for" />
        </PublicLayout>
      </Route>

      <Route path="/for/:slug">
        {(params) => (
          <PublicLayout>
            <PseoDetailPage sectionKey="for" slug={params.slug} />
          </PublicLayout>
        )}
      </Route>

      <Route path="/reviews">
        <PublicLayout>
          <PseoSectionPage sectionKey="reviews" />
        </PublicLayout>
      </Route>

      <Route path="/reviews/:slug">
        {(params) => (
          <PublicLayout>
            <PseoDetailPage sectionKey="reviews" slug={params.slug} />
          </PublicLayout>
        )}
      </Route>

      <Route path="/privacy">
        <PublicLayout>
          <PrivacyPolicy />
        </PublicLayout>
      </Route>

      <Route path="/terms">
        <PublicLayout>
          <TermsOfService />
        </PublicLayout>
      </Route>

      <Route path="/disclaimer">
        <PublicLayout>
          <MedicalDisclaimer />
        </PublicLayout>
      </Route>

      <Route path="/faq">
        <PublicLayout>
          <FAQPage />
        </PublicLayout>
      </Route>

      <Route path="/admin/partners">
        <DashboardLayout>
          <AffiliatePartnersAdmin />
        </DashboardLayout>
      </Route>

      <Route path="/admin">
        <DashboardLayout>
          <InsightsOverview />
        </DashboardLayout>
      </Route>

      {/* 404 */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <QuizProvider>
            <SessionTracker />
            <Router />
          </QuizProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
