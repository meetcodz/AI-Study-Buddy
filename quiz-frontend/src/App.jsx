import { useState } from 'react';
import QuizSetup from './components/QuizSetup';
import Quiz from './components/Quiz';
import ResultDashboard from './components/ResultDashboard';

export default function App() {
  const [quizLength, setQuizLength] = useState(null);
  const [results, setResults] = useState(null);

  // Landing → Quiz Setup
  if (!quizLength && !results) {
    return <QuizSetup onStart={(len) => setQuizLength(len)} />;
  }

  // Results Dashboard
  if (results) {
    return (
      <ResultDashboard
        quizResults={results}
        onRetake={() => { setResults(null); setQuizLength(null); }}
      />
    );
  }

  // Active Quiz
  return (
    <Quiz
      quizLength={quizLength}
      onBack={() => setQuizLength(null)}
      onFinish={(res) => setResults(res)}
    />
  );
}
