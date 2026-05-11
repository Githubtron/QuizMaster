import { useState, useCallback } from 'react'

export function useQuiz(questions = []) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})  // { questionId: 'a' | 'b' | 'c' | 'd' }

  const currentQuestion = questions[currentIndex] ?? null
  const totalQuestions = questions.length
  const answeredCount = Object.keys(answers).length
  const isFirst = currentIndex === 0
  const isLast = currentIndex === totalQuestions - 1

  const selectAnswer = useCallback((questionId, option) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }))
  }, [])

  const goNext = useCallback(() => {
    setCurrentIndex(i => Math.min(i + 1, totalQuestions - 1))
  }, [totalQuestions])

  const goPrev = useCallback(() => {
    setCurrentIndex(i => Math.max(i - 1, 0))
  }, [])

  const goTo = useCallback((index) => {
    setCurrentIndex(Math.max(0, Math.min(index, totalQuestions - 1)))
  }, [totalQuestions])

  return {
    currentIndex, currentQuestion, totalQuestions,
    answers, answeredCount,
    isFirst, isLast,
    selectAnswer, goNext, goPrev, goTo,
  }
}
