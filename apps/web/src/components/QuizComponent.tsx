import React, { useState } from 'react';
import { CheckCircle, XCircle, Award } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface QuizComponentProps {
  questions: Question[];
  onComplete: (score: number) => void;
}

export default function QuizComponent({ questions, onComplete }: QuizComponentProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);

  const handleAnswer = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
    setShowExplanation(true);

    // Auto advance after 2 seconds if correct
    if (answerIndex === questions[currentQuestion].correctAnswer) {
      setTimeout(() => {
        handleNext();
      }, 2000);
    }
  };

  const handleNext = () => {
    setShowExplanation(false);
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateScore();
    }
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        correct++;
      }
    });
    const finalScore = Math.round((correct / questions.length) * 100);
    setScore(finalScore);
    setShowResult(true);
    onComplete(finalScore);
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswers([]);
    setShowResult(false);
    setShowExplanation(false);
    setScore(0);
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-gray-900 rounded-lg">
        <p className="text-gray-400">Nenhuma questão disponível para este quiz.</p>
      </div>
    );
  }

  if (showResult) {
    const passed = score >= 70;
    return (
      <div className="max-w-2xl mx-auto p-8 bg-slate-900 rounded-lg text-center">
        <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
          passed ? 'bg-green-500/20' : 'bg-red-500/20'
        }`}>
          {passed ? (
            <Award className="w-12 h-12 text-green-500" />
          ) : (
            <XCircle className="w-12 h-12 text-red-500" />
          )}
        </div>

        <h2 className="text-3xl font-bold text-white mb-4">
          {passed ? 'Parabéns!' : 'Tente Novamente'}
        </h2>

        <p className="text-xl text-gray-300 mb-2">
          Você acertou {selectedAnswers.filter((ans, idx) => ans === questions[idx].correctAnswer).length} de {questions.length} questões
        </p>

        <div className="text-5xl font-bold mb-6">
          <span className={score >= 70 ? 'text-green-500' : 'text-red-500'}>
            {score}%
          </span>
        </div>

        <p className="text-gray-400 mb-8">
          {passed 
            ? 'Você passou no quiz! Continue para a próxima aula.'
            : 'Você precisa de pelo menos 70% para passar. Revise o conteúdo e tente novamente.'}
        </p>

        <div className="flex justify-center space-x-4">
          <button
            onClick={restartQuiz}
            className="px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Tentar Novamente
          </button>
          {passed && (
            <button
              className="px-6 py-3 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
            >
              Continuar
            </button>
          )}
        </div>

        {/* Detailed Results */}
        <div className="mt-8 text-left">
          <h3 className="text-lg font-semibold text-white mb-4">Revisão das Respostas</h3>
          <div className="space-y-3">
            {questions.map((question, index) => {
              const isCorrect = selectedAnswers[index] === question.correctAnswer;
              return (
                <div key={question.id} className="flex items-center space-x-3">
                  {isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className="text-gray-300">
                    Questão {index + 1}: {isCorrect ? 'Correta' : 'Incorreta'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const isAnswered = selectedAnswers[currentQuestion] !== undefined;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Questão {currentQuestion + 1} de {questions.length}</span>
          <span>{Math.round(((currentQuestion) / questions.length) * 100)}% completo</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div 
            className="bg-red-600 h-2 rounded-full transition-all"
            style={{ width: `${((currentQuestion) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-slate-900 rounded-lg p-8">
        <h3 className="text-xl font-semibold text-white mb-6">
          {question.question}
        </h3>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswers[currentQuestion] === index;
            const isCorrect = index === question.correctAnswer;
            const showFeedback = isAnswered && (isSelected || isCorrect);

            return (
              <button
                key={index}
                onClick={() => !isAnswered && handleAnswer(index)}
                disabled={isAnswered}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  !isAnswered 
                    ? 'border-slate-700 hover:border-coral hover:bg-slate-800'
                    : showFeedback
                      ? isCorrect
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-red-500 bg-red-500/10'
                      : 'border-slate-700 opacity-50'
                } ${!isAnswered ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`${
                    showFeedback
                      ? isCorrect
                        ? 'text-green-400'
                        : 'text-red-400'
                      : 'text-gray-300'
                  }`}>
                    {option}
                  </span>
                  {showFeedback && (
                    isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : isSelected ? (
                      <XCircle className="w-5 h-5 text-red-500" />
                    ) : null
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {showExplanation && question.explanation && (
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-400">
              <strong>Explicação:</strong> {question.explanation}
            </p>
          </div>
        )}

        {/* Navigation */}
        {isAnswered && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
            >
              {currentQuestion < questions.length - 1 ? 'Próxima Questão' : 'Ver Resultado'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}