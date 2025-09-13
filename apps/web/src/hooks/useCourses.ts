import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import courseService from '../services/course.service';
import toast from 'react-hot-toast';

export const useCourses = () => {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => courseService.getCourses(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    // Removed refetchOnMount: false - let it fetch on first mount, then use cache
  });
};

export const useCourse = (courseId: string) => {
  return useQuery({
    queryKey: ['course', courseId],
    queryFn: () => courseService.getCourse(courseId),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useModules = (courseId: string) => {
  return useQuery({
    queryKey: ['modules', courseId],
    queryFn: () => courseService.getModules(courseId),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useLessons = (moduleId: string) => {
  return useQuery({
    queryKey: ['lessons', moduleId],
    queryFn: () => courseService.getLessons(moduleId),
    enabled: !!moduleId,
  });
};

export const useLesson = (lessonId: string) => {
  return useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => courseService.getLesson(lessonId),
    enabled: !!lessonId,
  });
};

export const useMarkLessonComplete = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (lessonId: string) => courseService.markLessonComplete(lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Aula marcada como completa!');
    },
    onError: () => {
      toast.error('Erro ao marcar aula como completa');
    },
  });
};

export const useUpdateVideoProgress = () => {
  return useMutation({
    mutationFn: ({ lessonId, position }: { lessonId: string; position: number }) => 
      courseService.updateVideoProgress(lessonId, position),
  });
};

export const useProgress = () => {
  return useQuery({
    queryKey: ['progress'],
    queryFn: () => courseService.getProgress(),
  });
};