"use client";

import { useState, useEffect } from "react";
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
  const [caseTitles, setCaseTitles] = useState<CaseTitle[]>([]);
  const [selectedCase, setSelectedCase] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [mcqQuestions, setMCQQuestions] = useState<MCQQuestion[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<number[]>([]);

  // Initialize welcome step
  useEffect(() => {
    generateCaseTitles();
  }, []);

  const generateCaseTitles = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await apiService.generateCaseTitles(document.id, 5);
      setCaseTitles(response.cases);
      setCurrentStep("case-selection");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to generate case titles"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaseSelect = (caseId: string, caseTitle: string) => {
    setSelectedCase({ id: caseId, title: caseTitle });
    setCurrentStep("case-options");
  };

  const handleGenerateMCQs = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await apiService.generateMCQs(
        document.id,
        selectedCase?.id,
        3
      );
      setMCQQuestions(response.questions);
      setCurrentStep("mcq-questions");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to generate MCQs"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleIdentifyConcepts = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await apiService.identifyConcepts(document.id, 3);
      setConcepts(response.concepts);
      setCurrentStep("concepts");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to identify concepts"
      );
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

  const toggleQuestion = (index: number) => {
    setExpandedQuestions((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
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
              onClick={generateCaseTitles}
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
                    onClick={handleGenerateMCQs}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    [A] Generate MCQs
                  </button>
                  <button
                    onClick={handleIdentifyConcepts}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                  >
                    [B] Identify Concepts
                  </button>
                  <button
                    onClick={() => handleExploreCase()}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                  >
                    [C] Explore Case
                  </button>
                  <button
                    onClick={handleStartOver}
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
                onClick={handleGenerateMCQs}
                className="bg-blue-600 hover:bg-blue-700 text-white p-6 h-auto flex flex-col gap-2"
              >
                <span className="text-lg">📝</span>
                <span>Generate MCQs</span>
                <span className="text-sm opacity-90">Test your knowledge</span>
              </Button>
              <Button
                onClick={handleIdentifyConcepts}
                className="bg-green-600 hover:bg-green-700 text-white p-6 h-auto flex flex-col gap-2"
              >
                <span className="text-lg">🧠</span>
                <span>Identify Concepts</span>
                <span className="text-sm opacity-90">Key learning points</span>
              </Button>
              <Button
                onClick={handleExploreCase}
                className="bg-purple-600 hover:bg-purple-700 text-white p-6 h-auto flex flex-col gap-2"
              >
                <span className="text-lg">💬</span>
                <span>Explore Case</span>
                <span className="text-sm opacity-90">Interactive chat</span>
              </Button>
            </div>
            <div className="mt-6">
              <Button
                onClick={handleStartOver}
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
            />

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                What would you like to do next?
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  onClick={handleGenerateMCQs}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Generate More MCQs
                </button>
                <button
                  onClick={handleIdentifyConcepts}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  Identify Concepts
                </button>
                <button
                  onClick={handleExploreCase}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                >
                  Explore Case
                </button>
                <button
                  onClick={handleStartOver}
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

            <ConceptsList concepts={conceptStrings} />

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                What would you like to do next?
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  onClick={handleGenerateMCQs}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Generate MCQs
                </button>
                <button
                  onClick={handleExploreCase}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                >
                  Explore Case
                </button>
                <button
                  onClick={handleStartOver}
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
                  onClick={handleGenerateMCQs}
                  variant="outline"
                  size="sm"
                >
                  Generate MCQs
                </Button>
                <Button
                  onClick={handleIdentifyConcepts}
                  variant="outline"
                  size="sm"
                >
                  Identify Concepts
                </Button>
                <Button onClick={handleStartOver} variant="outline" size="sm">
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
          onClick={onBack}
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
    </div>
  );
}
