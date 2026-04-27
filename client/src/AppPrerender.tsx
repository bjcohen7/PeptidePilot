import React from "react";
import { Route, Router as WouterRouter, Switch } from "wouter";
import NotFound from "@/pages/NotFound";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import About from "./pages/About";
import Blog from "./pages/Blog";
import BlogArticle from "./pages/BlogArticle";
import { PrivacyPolicy, TermsOfService, MedicalDisclaimer } from "./pages/Legal";
import { PseoHub, PseoSectionPage, FAQPage } from "./pages/PseoPages";
import PeptideProfile from "./pages/pseo/PeptideProfile";
import GoalPage from "./pages/pseo/GoalPage";
import ComparisonPage from "./pages/pseo/ComparisonPage";
import StackPage from "./pages/pseo/StackPage";
import GuidePage from "./pages/pseo/GuidePage";
import ForConditionPage from "./pages/pseo/ForConditionPage";
import ReviewPage from "./pages/pseo/ReviewPage";
import QuizEntry from "./pages/QuizEntry";

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export default function AppPrerender({ path }: { path: string }) {
  return (
    <WouterRouter ssrPath={path}>
      <Switch>
        <Route path="/">
          <PublicLayout>
            <Home />
          </PublicLayout>
        </Route>

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
              <PeptideProfile params={params} />
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
              <GoalPage params={params} />
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
              <ComparisonPage params={params} />
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
              <StackPage params={params} />
            </PublicLayout>
          )}
        </Route>

        <Route path="/guides">
          <PublicLayout>
            <PseoSectionPage sectionKey="guides" />
          </PublicLayout>
        </Route>

        <Route path="/guides/:slug">
          <PublicLayout>
            <GuidePage />
          </PublicLayout>
        </Route>

        <Route path="/for">
          <PublicLayout>
            <PseoSectionPage sectionKey="for" />
          </PublicLayout>
        </Route>

        <Route path="/for/:slug">
          <PublicLayout>
            <ForConditionPage />
          </PublicLayout>
        </Route>

        <Route path="/reviews">
          <PublicLayout>
            <PseoSectionPage sectionKey="reviews" />
          </PublicLayout>
        </Route>

        <Route path="/reviews/:slug">
          <PublicLayout>
            <ReviewPage />
          </PublicLayout>
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

        {/* Noindex routes: prerendered so they get their own HTML with correct
            noindex/canonical tags instead of falling back to the home page */}
        <Route path="/quiz">
          <QuizEntry />
        </Route>

        <Route path="/processing">
          <div className="min-h-screen bg-background" />
        </Route>

        <Route path="/results">
          <div className="min-h-screen bg-background" />
        </Route>

        {/* Explicit /404 route so the prerender script can generate a 404/index.html
            that the server serves with HTTP 404 status for unknown pseo paths */}
        <Route path="/404">
          <NotFound />
        </Route>

        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}
