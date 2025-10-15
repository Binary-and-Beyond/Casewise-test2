"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  apiService,
  CaseTitle,
  MCQQuestion,
  Concept,
  Document,
} from "@/lib/api";
import { CasesList } from "./cases-list";
import { MCQQuestionsList } from "./mcq-questions-list";
import { InteractiveMCQQuestionsList } from "./interactive-mcq-questions-list";
import { ConceptsList } from "./concepts-list";
import { AIChat } from "./ai-chat";
import { MCQCompletionPopup } from "./mcq-completion-popup";
import { NavigationWarningPopup } from "./navigation-warning-popup";

type ChatbotStep =
  | "welcome"
  | "case-selection"
  | "case-options"
  | "mcq-questions"
  | "concepts"
  | "explore-case";

interface ChatbotFlowProps {
  document: Document;
  onBack: () => void;
}

export function ChatbotFlow({ document, onBack }: ChatbotFlowProps) {
  const [currentStep, setCurrentStep] = useState<ChatbotStep>("welcome");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Data states
  const [caseTitles, setCaseTitles] = useState<CaseTitle[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cachedCases = localStorage.getItem(`case_titles_${document.id}`);
        if (cachedCases) {
          const parsedCases = JSON.parse(cachedCases);
          console.log(
            "🚀 Initializing case titles from localStorage for document:",
            document.id,
            parsedCases.length,
            "cases"
          );
          return parsedCases;
        }
      } catch (e) {
        console.log("❌ Failed to parse cached case titles on init:", e);
      }
    }
    return [];
  });
  const [selectedCase, setSelectedCase] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [mcqQuestions, setMCQQuestions] = useState<MCQQuestion[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cachedMCQs = localStorage.getItem(`mcq_questions_${document.id}`);
        if (cachedMCQs) {
          const parsedMCQs = JSON.parse(cachedMCQs);
          console.log(
            "🚀 Initializing MCQ questions from localStorage for document:",
            document.id,
            parsedMCQs.length,
            "questions"
          );
          return parsedMCQs;
        }
      } catch (e) {
        console.log("❌ Failed to parse cached MCQ questions on init:", e);
      }
    }
    return [];
  });
  const [concepts, setConcepts] = useState<Concept[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cachedConcepts = localStorage.getItem(`concepts_${document.id}`);
        if (cachedConcepts) {
          const parsedConcepts = JSON.parse(cachedConcepts);
          console.log(
            "🚀 Initializing concepts from localStorage for document:",
            document.id,
            parsedConcepts.length,
            "concepts"
          );
          return parsedConcepts;
        }
      } catch (e) {
        console.log("❌ Failed to parse cached concepts on init:", e);
      }
    }
    return [];
  });
  const [chatId, setChatId] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<number[]>([]);

  // MCQ completion and navigation warning states
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [completionStats, setCompletionStats] = useState({
    correct: 0,
    total: 0,
  });
  const [showNavigationWarning, setShowNavigationWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<
    (() => void) | null
  >(null);
  const [hasUnsavedProgress, setHasUnsavedProgress] = useState(false);

  // Initialize welcome step
  useEffect(() => {
    generateCaseTitles();
  }, []);

  // Persist MCQ questions to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined" && mcqQuestions.length > 0) {
      try {
        localStorage.setItem(
          `mcq_questions_${document.id}`,
          JSON.stringify(mcqQuestions)
        );
        console.log(
          "💾 Saved MCQ questions to localStorage for document:",
          document.id,
          mcqQuestions.length,
          "questions"
        );
      } catch (e) {
        console.log("❌ Failed to save MCQ questions to localStorage:", e);
      }
    }
  }, [mcqQuestions, document.id]);

  // Persist concepts to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined" && concepts.length > 0) {
      try {
        localStorage.setItem(
          `concepts_${document.id}`,
          JSON.stringify(concepts)
        );
        console.log(
          "💾 Saved concepts to localStorage for document:",
          document.id,
          concepts.length,
          "concepts"
        );
      } catch (e) {
        console.log("❌ Failed to save concepts to localStorage:", e);
      }
    }
  }, [concepts, document.id]);

  // Persist case titles to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined" && caseTitles.length > 0) {
      try {
        localStorage.setItem(
          `case_titles_${document.id}`,
          JSON.stringify(caseTitles)
        );
        console.log(
          "💾 Saved case titles to localStorage for document:",
          document.id,
          caseTitles.length,
          "cases"
        );
      } catch (e) {
        console.log("❌ Failed to save case titles to localStorage:", e);
      }
    }
  }, [caseTitles, document.id]);

  const generateCaseTitles = async (retryCount = 0) => {
    // If we already have case titles, don't regenerate them
    if (caseTitles.length > 0) {
      console.log(
        "🚀 Case titles already exist, skipping generation:",
        caseTitles.length,
        "cases"
      );
      setCurrentStep("case-selection");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const response = await apiService.generateCaseTitles(document.id, 5);
      setCaseTitles(response.cases);
      setCurrentStep("case-selection");
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to generate case titles";
      console.error("Generate case titles error:", error);

      // Retry logic - retry up to 2 times
      if (retryCount < 2) {
        console.log(
          `🔄 Retrying case title generation (attempt ${retryCount + 1}/2)...`
        );
        setTimeout(() => {
          generateCaseTitles(retryCount + 1);
        }, 2000); // Wait 2 seconds before retry
      } else {
        setError(`${errorMessage} (Failed after 3 attempts)`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaseSelect = (caseId: string, caseTitle: string) => {
    setSelectedCase({ id: caseId, title: caseTitle });
    setCurrentStep("case-options");
  };

  const handleGenerateMCQs = async (retryCount = 0) => {
    // If we already have MCQ questions, check if they have hints
    if (mcqQuestions.length > 0) {
      const hasHints = mcqQuestions.some((q) => q.hint && q.hint.trim() !== "");
      if (hasHints) {
        console.log(
          "🚀 MCQ questions with hints already exist, skipping generation:",
          mcqQuestions.length,
          "questions"
        );
        setCurrentStep("mcq-questions");
        return;
      } else {
        console.log(
          "🔄 MCQ questions exist but without hints, regenerating with hints:",
          mcqQuestions.length,
          "questions"
        );
      }
    }

    setIsLoading(true);
    setError("");
    try {
      const response = await apiService.generateMCQs(
        document.id,
        selectedCase?.id,
        5,
        true // Include hints
      );
      setMCQQuestions(response.questions);
      setCurrentStep("mcq-questions");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate MCQs";
      console.error("MCQ generation error:", error);

      // Retry logic - retry up to 2 times
      if (retryCount < 2) {
        console.log(
          `🔄 Retrying MCQ generation (attempt ${retryCount + 1}/2)...`
        );
        setTimeout(() => {
          handleGenerateMCQs(retryCount + 1);
        }, 2000); // Wait 2 seconds before retry
      } else {
        setError(`${errorMessage} (Failed after 3 attempts)`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleIdentifyConcepts = async (retryCount = 0) => {
    // If we already have concepts, don't regenerate them
    if (concepts.length > 0) {
      console.log(
        "🚀 Concepts already exist, skipping generation:",
        concepts.length,
        "concepts"
      );
      setCurrentStep("concepts");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const response = await apiService.identifyConcepts(document.id, 5);
      setConcepts(response.concepts);
      setCurrentStep("concepts");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Identify concepts error:", error);
      console.error("Error details:", {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        documentId: document.id,
      });

      // Retry logic - retry up to 2 times
      if (retryCount < 2) {
        console.log(
          `🔄 Retrying concept identification (attempt ${retryCount + 1}/2)...`
        );
        setTimeout(() => {
          handleIdentifyConcepts(retryCount + 1);
        }, 2000); // Wait 2 seconds before retry
      } else {
        setError(
          `Failed to identify concepts: ${errorMessage} (Failed after 3 attempts)`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExploreCase = async () => {
    setIsLoading(true);
    setError("");
    try {
      // Create a new chat session for case exploration
      const chatResponse = await apiService.createChat({
        document_id: document.id,
      });
      setChatId(chatResponse.id);
      setCurrentStep("explore-case");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to create chat session"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartOver = () => {
    setSelectedCase(null);
    setMCQQuestions([]);
    setConcepts([]);
    setChatId(null);
    setExpandedQuestions([]);
    setCurrentStep("case-selection");
  };

  const handleStartOverWithWarning = () => {
    handleNavigationAttempt(handleStartOver);
  };

  const handleBackToOptions = () => {
    setCurrentStep("case-options");
  };

  const handleBackToOptionsWithWarning = () => {
    handleNavigationAttempt(handleBackToOptions);
  };

  const handleBackToDashboardWithWarning = () => {
    handleNavigationAttempt(onBack);
  };

  const toggleQuestion = (index: number) => {
    setExpandedQuestions((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  // MCQ completion handlers
  const handleMCQCompletion = useCallback(
    (correctAnswers: number, totalQuestions: number) => {
      console.log("🎯 MCQ Completion triggered!");
      console.log("📊 Correct answers:", correctAnswers);
      console.log("📊 Total questions:", totalQuestions);

      setCompletionStats({ correct: correctAnswers, total: totalQuestions });
      setShowCompletionPopup(true);
      setHasUnsavedProgress(false); // Progress is now saved/completed

      console.log("✅ Completion popup should now be visible");
      console.log("🔍 showCompletionPopup state should be true");
    },
    []
  );

  const handleCompletionPopupClose = () => {
    console.log("🔄 Closing completion popup (chatbot-flow)");
    setShowCompletionPopup(false);
  };

  const handleCompletionPopupContinue = async () => {
    console.log("🔄 Finishing completion popup (chatbot-flow)");
    console.log("📊 Completion stats:", completionStats);
    console.log("📋 Selected case:", selectedCase);

    try {
      // Update user analytics with MCQ completion data
      const analyticsData = {
        correct_answers: completionStats.correct,
        total_questions: completionStats.total,
        case_id: selectedCase?.id,
      };

      console.log("📤 Sending analytics data:", analyticsData);

      const result = await apiService.updateMCQAnalytics(analyticsData);

      console.log("✅ Analytics updated successfully:", result);
    } catch (error) {
      console.error("❌ Failed to update analytics:", error);
      console.error("❌ Error details:", error);
      // Don't block the user flow if analytics update fails
    }

    setShowCompletionPopup(false);
    // Could navigate to next section or show summary
  };

  // Track when user starts answering questions
  const handleQuestionAttempted = () => {
    setHasUnsavedProgress(true);
  };

  // Navigation warning handlers
  const handleNavigationAttempt = (navigationFunction: () => void) => {
    if (hasUnsavedProgress) {
      setPendingNavigation(() => navigationFunction);
      setShowNavigationWarning(true);
    } else {
      navigationFunction();
    }
  };

  const handleNavigationConfirm = () => {
    setShowNavigationWarning(false);
    setHasUnsavedProgress(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const handleNavigationCancel = () => {
    setShowNavigationWarning(false);
    setPendingNavigation(null);
  };

  const renderCurrentStep = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">
            {currentStep === "welcome" && "Generating case titles..."}
            {currentStep === "mcq-questions" && "Generating MCQ questions..."}
            {currentStep === "concepts" && "Identifying key concepts..."}
            {currentStep === "explore-case" && "Setting up chat session..."}
          </p>
        </div>
      );
    }

    switch (currentStep) {
      case "welcome":
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to CaseWise!
            </h2>
            <p className="text-gray-600 mb-6">
              Please upload a document (PDF, PPT, DOCX, TXT) to get started.
            </p>
            <Button
              onClick={() => generateCaseTitles()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Generate Cases
            </Button>
          </div>
        );

      case "case-selection":
        // Convert API case titles to your existing Case interface
        const adaptedCases = caseTitles.map((caseTitle) => ({
          title: caseTitle.title,
          difficulty: caseTitle.difficulty,
          description: caseTitle.description,
        }));

        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Select a Case to Work On
              </h2>
              <p className="text-gray-600">
                Choose one of the generated medical cases below to proceed with
                your learning.
              </p>
            </div>

            <CasesList
              cases={adaptedCases}
              onCaseSelect={(title) => {
                const selectedCaseData = caseTitles.find(
                  (c) => c.title === title
                );
                if (selectedCaseData) {
                  handleCaseSelect(selectedCaseData.id, selectedCaseData.title);
                }
              }}
            />

            {selectedCase && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  What would you like to do next?
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <button
                    onClick={() => handleGenerateMCQs()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    [A] Generate MCQs
                  </button>
                  <button
                    onClick={() => handleIdentifyConcepts()}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                  >
                    [B] Identify Concepts
                  </button>
                  <button
                    onClick={() =>
                      handleNavigationAttempt(() => handleExploreCase())
                    }
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                  >
                    [C] Explore Case
                  </button>
                  <button
                    onClick={() => handleNavigationAttempt(handleStartOver)}
                    className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg"
                  >
                    [D] Start Over
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case "case-options":
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Case Selected: {selectedCase?.title}
            </h2>
            <p className="text-gray-600 mb-8">
              What would you like to do with this case?
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-2xl mx-auto">
              <Button
                onClick={() => handleGenerateMCQs()}
                className="bg-blue-600 hover:bg-blue-700 text-white p-6 h-auto flex flex-col gap-2"
              >
                <span className="text-lg">📝</span>
                <span>Generate MCQs</span>
                <span className="text-sm opacity-90">Test your knowledge</span>
              </Button>
              <Button
                onClick={() => handleIdentifyConcepts()}
                className="bg-green-600 hover:bg-green-700 text-white p-6 h-auto flex flex-col gap-2"
              >
                <span className="text-lg">🧠</span>
                <span>Identify Concepts</span>
                <span className="text-sm opacity-90">Key learning points</span>
              </Button>
              <Button
                onClick={() => handleNavigationAttempt(handleExploreCase)}
                className="bg-purple-600 hover:bg-purple-700 text-white p-6 h-auto flex flex-col gap-2"
              >
                <span className="text-lg">💬</span>
                <span>Explore Case</span>
                <span className="text-sm opacity-90">Interactive chat</span>
              </Button>
            </div>
            <div className="mt-6">
              <Button
                onClick={() => handleNavigationAttempt(handleStartOver)}
                variant="outline"
                className="border-gray-300 text-gray-700"
              >
                Select Different Case
              </Button>
            </div>
          </div>
        );

      case "mcq-questions":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                MCQ Questions
              </h2>
              <p className="text-gray-600">
                Select your answers and click "Explain" to see detailed
                explanations.
              </p>
            </div>

            <InteractiveMCQQuestionsList
              questions={mcqQuestions}
              expandedQuestions={expandedQuestions}
              onToggleQuestion={toggleQuestion}
              onAllQuestionsCompleted={handleMCQCompletion}
              onQuestionAttempted={handleQuestionAttempted}
            />

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                What would you like to do next?
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  onClick={() => handleGenerateMCQs()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Generate More MCQs
                </button>
                <button
                  onClick={() =>
                    handleNavigationAttempt(() => handleIdentifyConcepts())
                  }
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  Identify Concepts
                </button>
                <button
                  onClick={() => handleNavigationAttempt(handleExploreCase)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                >
                  Explore Case
                </button>
                <button
                  onClick={() => handleNavigationAttempt(handleStartOver)}
                  className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg"
                >
                  Select Different Case
                </button>
              </div>
            </div>
          </div>
        );

      case "concepts":
        // Convert API concepts to simple strings for your existing component
        const conceptStrings = concepts.map(
          (c) => `${c.title}: ${c.description}`
        );

        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Key Medical Concepts
              </h2>
              <p className="text-gray-600">
                Here are the most important concepts extracted from the document
                for your learning.
              </p>
            </div>

            <ConceptsList
              concepts={conceptStrings}
              onConceptSelect={(concept) => {
                console.log("Selected concept:", concept);
                // You can add navigation logic here if needed
              }}
            />

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                What would you like to do next?
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  onClick={() => handleGenerateMCQs()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Generate MCQs
                </button>
                <button
                  onClick={() => handleNavigationAttempt(handleExploreCase)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                >
                  Explore Case
                </button>
                <button
                  onClick={() => handleNavigationAttempt(handleStartOver)}
                  className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg"
                >
                  Select Different Case
                </button>
              </div>
            </div>
          </div>
        );

      case "explore-case":
        return chatId ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Explore: {selectedCase?.title}
              </h2>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleGenerateMCQs()}
                  variant="outline"
                  size="sm"
                >
                  Generate MCQs
                </Button>
                <Button
                  onClick={() =>
                    handleNavigationAttempt(() => handleIdentifyConcepts())
                  }
                  variant="outline"
                  size="sm"
                >
                  Identify Concepts
                </Button>
                <Button
                  onClick={() => handleNavigationAttempt(handleStartOver)}
                  variant="outline"
                  size="sm"
                >
                  Select Different Case
                </Button>
              </div>
            </div>
            <div className="h-[600px] border border-gray-200 rounded-lg">
              <AIChat
                chatId={chatId}
                documentId={document.id}
                caseTitle={selectedCase?.title}
              />
            </div>
          </div>
        ) : null;

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CaseWise Chatbot</h1>
          <p className="text-gray-600">Document: {document.filename}</p>
        </div>
        <Button
          onClick={handleBackToDashboardWithWarning}
          variant="outline"
          className="border-gray-300 text-gray-700"
        >
          ← Back to Dashboard
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
          <Button
            onClick={() => setError("")}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {renderCurrentStep()}
      </div>

      {/* MCQ Completion Popup */}
      <MCQCompletionPopup
        isOpen={showCompletionPopup}
        correctAnswers={completionStats.correct}
        totalQuestions={completionStats.total}
        onClose={handleCompletionPopupClose}
        onContinue={handleCompletionPopupContinue}
      />

      {/* Navigation Warning Popup */}
      <NavigationWarningPopup
        isOpen={showNavigationWarning}
        onClose={handleNavigationCancel}
        onConfirm={handleNavigationConfirm}
        onCancel={handleNavigationCancel}
      />
    </div>
  );
}
