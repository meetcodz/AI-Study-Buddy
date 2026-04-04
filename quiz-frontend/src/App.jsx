import { useState } from 'react';
import QuizSetup from './components/QuizSetup';
import Quiz from './components/Quiz';
import ResultDashboard from './components/ResultDashboard';

export default function App() {
  // quizSettings = { length: 10, topic: 'Physics' } or null
  const [quizSettings, setQuizSettings] = useState(null);
  const [results, setResults] = useState(null);

  // Landing → Quiz Setup
  if (!quizSettings && !results) {
    return (
      <QuizSetup
        onStart={(length, topic = null, questionIds = null) => setQuizSettings({ length, topic, questionIds })}
      />
    );
  }

  // Results Dashboard
  if (results) {
    return (
      <ResultDashboard
        quizResults={results}
        onRetake={() => { setResults(null); setQuizSettings(null); }}
      />
    );
  }

  // Active Quiz
  return (
    <Quiz
      quizLength={quizSettings.length}
      topic={quizSettings.topic}
      questionIds={quizSettings.questionIds}
      onBack={() => setQuizSettings(null)}
      onFinish={(res) => setResults(res)}
    />
  );
}

