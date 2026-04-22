import { Suspense, lazy, useEffect } from "react";
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
import PersistentRecommendationBar from "./components/PersistentRecommendationBar";
import { UserSessionProvider } from "./contexts/UserSessionContext";

// Pages
const Home = lazy(() => import("./pages/Home"));
const QuizEntry = lazy(() => import("./pages/QuizEntry"));
const QuizFlow = lazy(() => import("./pages/QuizFlow"));
const Processing = lazy(() => import("./pages/Processing"));
const Results = lazy(() => import("./pages/Results"));
const About = lazy(() => import("./pages/About"));
const Blog = lazy(() => import("./pages/Blog"));
const PrivacyPolicy = lazy(() =>
  import("./pages/Legal").then((module) => ({ default: module.PrivacyPolicy })),
);
const TermsOfService = lazy(() =>
  import("./pages/Legal").then((module) => ({ default: module.TermsOfService })),
);
const MedicalDisclaimer = lazy(() =>
  import("./pages/Legal").then((module) => ({ default: module.MedicalDisclaimer })),
);
const BlogArticle = lazy(() => import("./pages/BlogArticle"));
const PseoHub = lazy(() =>
  import("./pages/PseoPages").then((module) => ({ default: module.PseoHub })),
);
const PseoSectionPage = lazy(() =>
  import("./pages/PseoPages").then((module) => ({ default: module.PseoSectionPage })),
);
const FAQPage = lazy(() =>
  import("./pages/PseoPages").then((module) => ({ default: module.FAQPage })),
);
const PeptideProfile = lazy(() => import("./pages/pseo/PeptideProfile"));
const GoalPage = lazy(() => import("./pages/pseo/GoalPage"));
const ComparisonPage = lazy(() => import("./pages/pseo/ComparisonPage"));
const StackPage = lazy(() => import("./pages/pseo/StackPage"));
const GuidePage = lazy(() => import("./pages/pseo/GuidePage"));
const ForConditionPage = lazy(() => import("./pages/pseo/ForConditionPage"));
const ReviewPage = lazy(() => import("./pages/pseo/ReviewPage"));
const AffiliatePartnersAdmin = lazy(() => import("./pages/admin/AffiliatePartners"));
const InsightsOverview = lazy(() => import("./pages/admin/InsightsOverview"));
const SessionDetail = lazy(() => import("./pages/admin/SessionDetail"));

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
      <PersistentRecommendationBar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function RouteFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center px-4">
      <div className="text-sm text-muted-foreground">Loading…</div>
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
          <Suspense fallback={<RouteFallback />}>
            <Home />
          </Suspense>
        </PublicLayout>
      </Route>

      {/* Quiz entry — minimal header, no footer */}
      <Route path="/quiz">
        <Suspense fallback={<RouteFallback />}>
          <QuizEntry />
        </Suspense>
      </Route>

      {/* Quiz flow — fully self-contained */}
      <Route path="/quiz/flow">
        <Suspense fallback={<RouteFallback />}>
          <QuizFlow />
        </Suspense>
      </Route>

      {/* Processing screen — no nav */}
      <Route path="/processing">
        <Suspense fallback={<RouteFallback />}>
          <Processing />
        </Suspense>
      </Route>

      {/* Results — manages its own header */}
      <Route path="/results">
        <Suspense fallback={<RouteFallback />}>
          <Results />
        </Suspense>
      </Route>

      {/* Supporting pages */}
      <Route path="/about">
        <PublicLayout>
          <Suspense fallback={<RouteFallback />}>
            <About />
          </Suspense>
        </PublicLayout>
      </Route>

      <Route path="/blog">
        <PublicLayout>
          <Suspense fallback={<RouteFallback />}>
            <Blog />
          </Suspense>
        </PublicLayout>
      </Route>

      <Route path="/blog/:slug">
        {(params) => (
          <PublicLayout>
            <Suspense fallback={<RouteFallback />}>
              <BlogArticle params={params} />
            </Suspense>
          </PublicLayout>
        )}
      </Route>

      <Route path="/learn">
        <PublicLayout>
          <Suspense fallback={<RouteFallback />}>
            <PseoHub />
          </Suspense>
        </PublicLayout>
      </Route>

      <Route path="/peptides">
        <PublicLayout>
          <Suspense fallback={<RouteFallback />}>
            <PseoSectionPage sectionKey="peptides" />
          </Suspense>
        </PublicLayout>
      </Route>

      <Route path="/peptides/:slug">
        {(params) => (
          <PublicLayout>
            <Suspense fallback={<RouteFallback />}>
              <PeptideProfile params={params} />
            </Suspense>
          </PublicLayout>
        )}
      </Route>

      <Route path="/goals">
        <PublicLayout>
          <Suspense fallback={<RouteFallback />}>
            <PseoSectionPage sectionKey="goals" />
          </Suspense>
        </PublicLayout>
      </Route>

      <Route path="/goals/:slug">
        {(params) => (
          <PublicLayout>
            <Suspense fallback={<RouteFallback />}>
              <GoalPage params={params} />
            </Suspense>
          </PublicLayout>
        )}
      </Route>

      <Route path="/compare">
        <PublicLayout>
          <Suspense fallback={<RouteFallback />}>
            <PseoSectionPage sectionKey="compare" />
          </Suspense>
        </PublicLayout>
      </Route>

      <Route path="/compare/:slug">
        {(params) => (
          <PublicLayout>
            <Suspense fallback={<RouteFallback />}>
              <ComparisonPage params={params} />
            </Suspense>
          </PublicLayout>
        )}
      </Route>

      <Route path="/stacks">
        <PublicLayout>
          <Suspense fallback={<RouteFallback />}>
            <PseoSectionPage sectionKey="stacks" />
          </Suspense>
        </PublicLayout>
      </Route>

      <Route path="/stacks/:slug">
        {(params) => (
          <PublicLayout>
            <Suspense fallback={<RouteFallback />}>
              <StackPage params={params} />
            </Suspense>
          </PublicLayout>
        )}
      </Route>

      <Route path="/guides">
        <PublicLayout>
          <Suspense fallback={<RouteFallback />}>
            <PseoSectionPage sectionKey="guides" />
          </Suspense>
        </PublicLayout>
      </Route>

      <Route path="/guides/:slug">
        <PublicLayout>
          <Suspense fallback={<RouteFallback />}>
            <GuidePage />
          </Suspense>
        </PublicLayout>
      </Route>

      <Route path="/for">
        <PublicLayout>
          <Suspense fallback={<RouteFallback />}>
            <PseoSectionPage sectionKey="for" />
          </Suspense>
        </PublicLayout>
      </Route>

      <Route path="/for/:slug">
        <PublicLayout>
          <Suspense fallback={<RouteFallback />}>
            <ForConditionPage />
          </Suspense>
        </PublicLayout>
      </Route>

      <Route path="/reviews">
        <PublicLayout>
          <Suspense fallback={<RouteFallback />}>
            <PseoSectionPage sectionKey="reviews" />
          </Suspense>
        </PublicLayout>
      </Route>

      <Route path="/reviews/:slug">
        <PublicLayout>
          <Suspense fallback={<RouteFallback />}>
            <ReviewPage />
          </Suspense>
        </PublicLayout>
      </Route>

      <Route path="/privacy">
        <PublicLayout>
          <Suspense fallback={<RouteFallback />}>
            <PrivacyPolicy />
          </Suspense>
        </PublicLayout>
      </Route>

      <Route path="/terms">
        <PublicLayout>
          <Suspense fallback={<RouteFallback />}>
            <TermsOfService />
          </Suspense>
        </PublicLayout>
      </Route>

      <Route path="/disclaimer">
        <PublicLayout>
          <Suspense fallback={<RouteFallback />}>
            <MedicalDisclaimer />
          </Suspense>
        </PublicLayout>
      </Route>

      <Route path="/faq">
        <PublicLayout>
          <Suspense fallback={<RouteFallback />}>
            <FAQPage />
          </Suspense>
        </PublicLayout>
      </Route>

      <Route path="/admin/partners">
        <DashboardLayout>
          <Suspense fallback={<RouteFallback />}>
            <AffiliatePartnersAdmin />
          </Suspense>
        </DashboardLayout>
      </Route>

      <Route path="/admin/sessions/:sessionId">
        {(params) => (
          <DashboardLayout>
            <Suspense fallback={<RouteFallback />}>
              <SessionDetail sessionId={params.sessionId} />
            </Suspense>
          </DashboardLayout>
        )}
      </Route>

      <Route path="/admin/sessions">
        <DashboardLayout>
          <Suspense fallback={<RouteFallback />}>
            <InsightsOverview />
          </Suspense>
        </DashboardLayout>
      </Route>

      <Route path="/admin">
        <DashboardLayout>
          <Suspense fallback={<RouteFallback />}>
            <InsightsOverview />
          </Suspense>
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
  useEffect(() => {
    void import("./pages/QuizEntry");
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <QuizProvider>
            <UserSessionProvider>
              <SessionTracker />
              <Router />
            </UserSessionProvider>
          </QuizProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
