import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Music, Heart, Dumbbell, Plane,
  Book, Film, Languages, Utensils, Plus, X, Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';

interface PersonalInterests {
  music?: string[];
  hobbies?: string[];
  gymFrequency?: 'never' | 'rarely' | '1-2x_week' | '3-4x_week' | '5+_week' | 'daily';
  travelInterests?: string[];
  favoriteBooks?: string[];
  favoriteMovies?: string[];
  languages?: string[];
  dietPreferences?: string[];
}

interface SuggestionsByCategory {
  abilities: string[];
  interests: string[];
  music: string[];
  hobbies: string[];
  travel: string[];
  books: string[];
  movies: string[];
  languages: string[];
  diet: string[];
}

export const ProfileNetworking: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Professional networking states
  const [abilities, setAbilities] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string>('available');
  
  // Personal interests states
  const [personalInterests, setPersonalInterests] = useState<PersonalInterests>({
    music: [],
    hobbies: [],
    gymFrequency: undefined,
    travelInterests: [],
    favoriteBooks: [],
    favoriteMovies: [],
    languages: [],
    dietPreferences: []
  });

  // Input states for adding new items
  const [newAbility, setNewAbility] = useState('');
  const [newInterest, setNewInterest] = useState('');
  const [newMusic, setNewMusic] = useState('');
  const [newHobby, setNewHobby] = useState('');
  const [newTravel, setNewTravel] = useState('');
  const [newBook, setNewBook] = useState('');
  const [newMovie, setNewMovie] = useState('');
  const [newLanguage, setNewLanguage] = useState('');
  const [newDiet, setNewDiet] = useState('');

  // Fetch suggestions from API
  const { data: suggestionsData } = useQuery({
    queryKey: ['profile-suggestions'],
    queryFn: async () => {
      const response = await fetch('/api/suggestions/public');
      if (!response.ok) throw new Error('Failed to fetch suggestions');
      return response.json();
    }
  });

  // Process suggestions by category
  const suggestions: SuggestionsByCategory = {
    abilities: [],
    interests: [],
    music: [],
    hobbies: [],
    travel: [],
    books: [],
    movies: [],
    languages: [],
    diet: []
  };

  if (suggestionsData?.data?.suggestions) {
    suggestionsData.data.suggestions.forEach((s: any) => {
      switch(s.category) {
        case 'abilities':
          suggestions.abilities.push(s.value);
          break;
        case 'interests':
          suggestions.interests.push(s.value);
          break;
        case 'music':
          suggestions.music.push(s.value);
          break;
        case 'hobbies':
          suggestions.hobbies.push(s.value);
          break;
        case 'travel':
          suggestions.travel.push(s.value);
          break;
        case 'books':
          suggestions.books.push(s.value);
          break;
        case 'movies':
          suggestions.movies.push(s.value);
          break;
        case 'languages':
          suggestions.languages.push(s.value);
          break;
        case 'diet':
          suggestions.diet.push(s.value);
          break;
      }
    });
  }

  // Fetch current user data
  const { data: userData, isLoading } = useQuery({
    queryKey: ['user-networking', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${Cookies.get('access_token') || localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch user data');
      return response.json();
    },
    enabled: !!user
  });

  // Update user mutation
  const updateProfile = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token') || localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Perfil de networking atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['user-networking'] });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      navigate('/perfil');
    },
    onError: () => {
      toast.error('Erro ao atualizar perfil');
    }
  });

  // Load current data
  useEffect(() => {
    if (userData?.data) {
      setAbilities(userData.data.abilities || []);
      setInterests(userData.data.interests || []);
      setLookingFor(userData.data.lookingFor || []);
      setAvailability(userData.data.availability || 'available');
      setPersonalInterests(userData.data.personalInterests || {
        music: [],
        hobbies: [],
        gymFrequency: undefined,
        travelInterests: [],
        favoriteBooks: [],
        favoriteMovies: [],
        languages: [],
        dietPreferences: []
      });
    }
  }, [userData]);

  const handleAddItem = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
    list: string[],
    listSetter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (value.trim() && !list.includes(value.trim())) {
      listSetter([...list, value.trim()]);
      setter('');
    }
  };

  const handleAddPersonalItem = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
    field: keyof PersonalInterests
  ) => {
    if (value.trim()) {
      const currentList = (personalInterests[field] as string[]) || [];
      if (!currentList.includes(value.trim())) {
        setPersonalInterests({
          ...personalInterests,
          [field]: [...currentList, value.trim()]
        });
        setter('');
      }
    }
  };

  const handleRemoveItem = (
    item: string,
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter(list.filter(i => i !== item));
  };

  const handleRemovePersonalItem = (
    item: string,
    field: keyof PersonalInterests
  ) => {
    const currentList = (personalInterests[field] as string[]) || [];
    setPersonalInterests({
      ...personalInterests,
      [field]: currentList.filter(i => i !== item)
    });
  };

  const handleToggleLookingFor = (item: string) => {
    if (lookingFor.includes(item)) {
      setLookingFor(lookingFor.filter(i => i !== item));
    } else {
      setLookingFor([...lookingFor, item]);
    }
  };

  const handleSave = () => {
    updateProfile.mutate({
      abilities,
      interests,
      lookingFor,
      availability,
      personalInterests
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/perfil')}
        className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft size={20} />
        Voltar para o Perfil
      </button>

      <h1 className="text-3xl font-bold text-slate-900 mb-8">Configurações de Networking</h1>

      {/* Professional Section */}
      <div className="bg-white rounded-2xl shadow-soft p-8 mb-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-6">Informações Profissionais</h2>

        {/* Abilities */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Habilidades
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newAbility}
              onChange={(e) => setNewAbility(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddItem(newAbility, setNewAbility, abilities, setAbilities)}
              placeholder="Digite uma habilidade ou escolha abaixo"
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral"
            />
            <button
              onClick={() => handleAddItem(newAbility, setNewAbility, abilities, setAbilities)}
              className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
          
          {/* Current abilities */}
          {abilities.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {abilities.map(ability => (
                <span key={ability} className="px-3 py-1 bg-coral/10 text-coral rounded-full text-sm flex items-center gap-1">
                  {ability}
                  <button onClick={() => handleRemoveItem(ability, abilities, setAbilities)}>
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
          
          {/* Suggested abilities */}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500 mb-2">Sugestões populares (clique para adicionar):</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.abilities.filter(s => !abilities.includes(s)).map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setAbilities([...abilities, suggestion])}
                  className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs hover:bg-coral/10 hover:text-coral transition-colors"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Professional Interests */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Interesses Profissionais
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddItem(newInterest, setNewInterest, interests, setInterests)}
              placeholder="Digite um interesse ou escolha abaixo"
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral"
            />
            <button
              onClick={() => handleAddItem(newInterest, setNewInterest, interests, setInterests)}
              className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
          
          {/* Current interests */}
          {interests.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {interests.map(interest => (
                <span key={interest} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1">
                  {interest}
                  <button onClick={() => handleRemoveItem(interest, interests, setInterests)}>
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
          
          {/* Suggested interests */}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500 mb-2">Sugestões populares (clique para adicionar):</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.interests.filter(s => !interests.includes(s)).map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setInterests([...interests, suggestion])}
                  className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs hover:bg-blue-100 hover:text-blue-700 transition-colors"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Looking For */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Procurando por
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {['mentorship', 'collaboration', 'partnership', 'networking', 'learning'].map(item => (
              <label key={item} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lookingFor.includes(item)}
                  onChange={() => handleToggleLookingFor(item)}
                  className="w-4 h-4 text-coral focus:ring-coral border-slate-300 rounded"
                />
                <span className="text-sm text-slate-700">
                  {item === 'mentorship' && 'Mentoria'}
                  {item === 'collaboration' && 'Colaboração'}
                  {item === 'partnership' && 'Parceria'}
                  {item === 'networking' && 'Networking'}
                  {item === 'learning' && 'Aprendizado'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Disponibilidade para Networking
          </label>
          <select
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral"
          >
            <option value="available">Disponível</option>
            <option value="busy">Ocupado</option>
            <option value="not_interested">Não disponível</option>
          </select>
        </div>
      </div>

      {/* Personal Interests Section */}
      <div className="bg-white rounded-2xl shadow-soft p-8 mb-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-6">Interesses Pessoais (Opcional)</h2>

        {/* Music */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <Music size={18} className="text-coral" />
            Estilos Musicais
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newMusic}
              onChange={(e) => setNewMusic(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddPersonalItem(newMusic, setNewMusic, 'music')}
              placeholder="Digite ou escolha abaixo"
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral"
            />
            <button
              onClick={() => handleAddPersonalItem(newMusic, setNewMusic, 'music')}
              className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
          
          {/* Current selections */}
          {personalInterests.music && personalInterests.music.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {personalInterests.music.map(item => (
                <span key={item} className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm flex items-center gap-1">
                  {item}
                  <button onClick={() => handleRemovePersonalItem(item, 'music')}>
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
          
          {/* Suggestions */}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500 mb-2">Sugestões (clique para adicionar):</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.music.filter(s => !personalInterests.music?.includes(s)).map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setPersonalInterests({
                    ...personalInterests,
                    music: [...(personalInterests.music || []), suggestion]
                  })}
                  className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs hover:bg-pink-100 hover:text-pink-700 transition-colors"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Hobbies */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <Heart size={18} className="text-coral" />
            Hobbies
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newHobby}
              onChange={(e) => setNewHobby(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddPersonalItem(newHobby, setNewHobby, 'hobbies')}
              placeholder="Digite ou escolha abaixo"
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral"
            />
            <button
              onClick={() => handleAddPersonalItem(newHobby, setNewHobby, 'hobbies')}
              className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
          
          {personalInterests.hobbies && personalInterests.hobbies.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {personalInterests.hobbies.map(item => (
                <span key={item} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-1">
                  {item}
                  <button onClick={() => handleRemovePersonalItem(item, 'hobbies')}>
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
          
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500 mb-2">Sugestões (clique para adicionar):</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.hobbies.filter(s => !personalInterests.hobbies?.includes(s)).map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setPersonalInterests({
                    ...personalInterests,
                    hobbies: [...(personalInterests.hobbies || []), suggestion]
                  })}
                  className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs hover:bg-purple-100 hover:text-purple-700 transition-colors"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Gym Frequency */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <Dumbbell size={18} className="text-coral" />
            Frequência na Academia
          </label>
          <select
            value={personalInterests.gymFrequency || ''}
            onChange={(e) => setPersonalInterests({ ...personalInterests, gymFrequency: e.target.value as any })}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral"
          >
            <option value="">Selecione...</option>
            <option value="never">Nunca</option>
            <option value="rarely">Raramente</option>
            <option value="1-2x_week">1-2x por semana</option>
            <option value="3-4x_week">3-4x por semana</option>
            <option value="5+_week">5+ vezes por semana</option>
            <option value="daily">Diariamente</option>
          </select>
        </div>

        {/* Travel Interests */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <Plane size={18} className="text-coral" />
            Destinos de Interesse
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newTravel}
              onChange={(e) => setNewTravel(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddPersonalItem(newTravel, setNewTravel, 'travelInterests')}
              placeholder="Digite ou escolha abaixo"
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral"
            />
            <button
              onClick={() => handleAddPersonalItem(newTravel, setNewTravel, 'travelInterests')}
              className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
          
          {personalInterests.travelInterests && personalInterests.travelInterests.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {personalInterests.travelInterests.map(item => (
                <span key={item} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm flex items-center gap-1">
                  {item}
                  <button onClick={() => handleRemovePersonalItem(item, 'travelInterests')}>
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
          
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500 mb-2">Sugestões (clique para adicionar):</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.travel.filter(s => !personalInterests.travelInterests?.includes(s)).map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setPersonalInterests({
                    ...personalInterests,
                    travelInterests: [...(personalInterests.travelInterests || []), suggestion]
                  })}
                  className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs hover:bg-green-100 hover:text-green-700 transition-colors"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Favorite Books */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <Book size={18} className="text-coral" />
            Livros Favoritos
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newBook}
              onChange={(e) => setNewBook(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddPersonalItem(newBook, setNewBook, 'favoriteBooks')}
              placeholder="Digite ou escolha abaixo"
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral"
            />
            <button
              onClick={() => handleAddPersonalItem(newBook, setNewBook, 'favoriteBooks')}
              className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
          
          {personalInterests.favoriteBooks && personalInterests.favoriteBooks.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {personalInterests.favoriteBooks.map(item => (
                <span key={item} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm flex items-center gap-1">
                  {item}
                  <button onClick={() => handleRemovePersonalItem(item, 'favoriteBooks')}>
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
          
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500 mb-2">Sugestões de livros de negócios e SEO:</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.books.filter(s => !personalInterests.favoriteBooks?.includes(s)).map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setPersonalInterests({
                    ...personalInterests,
                    favoriteBooks: [...(personalInterests.favoriteBooks || []), suggestion]
                  })}
                  className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs hover:bg-amber-100 hover:text-amber-700 transition-colors"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Favorite Movies */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <Film size={18} className="text-coral" />
            Filmes e Séries Favoritos
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newMovie}
              onChange={(e) => setNewMovie(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddPersonalItem(newMovie, setNewMovie, 'favoriteMovies')}
              placeholder="Digite ou escolha abaixo"
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral"
            />
            <button
              onClick={() => handleAddPersonalItem(newMovie, setNewMovie, 'favoriteMovies')}
              className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
          
          {personalInterests.favoriteMovies && personalInterests.favoriteMovies.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {personalInterests.favoriteMovies.map(item => (
                <span key={item} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm flex items-center gap-1">
                  {item}
                  <button onClick={() => handleRemovePersonalItem(item, 'favoriteMovies')}>
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
          
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500 mb-2">Sugestões de filmes e séries tech:</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.movies.filter(s => !personalInterests.favoriteMovies?.includes(s)).map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setPersonalInterests({
                    ...personalInterests,
                    favoriteMovies: [...(personalInterests.favoriteMovies || []), suggestion]
                  })}
                  className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs hover:bg-red-100 hover:text-red-700 transition-colors"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Languages */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <Languages size={18} className="text-coral" />
            Idiomas
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newLanguage}
              onChange={(e) => setNewLanguage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddPersonalItem(newLanguage, setNewLanguage, 'languages')}
              placeholder="Digite ou escolha abaixo"
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral"
            />
            <button
              onClick={() => handleAddPersonalItem(newLanguage, setNewLanguage, 'languages')}
              className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
          
          {personalInterests.languages && personalInterests.languages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {personalInterests.languages.map(item => (
                <span key={item} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm flex items-center gap-1">
                  {item}
                  <button onClick={() => handleRemovePersonalItem(item, 'languages')}>
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
          
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500 mb-2">Sugestões (clique para adicionar):</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.languages.filter(s => !personalInterests.languages?.includes(s)).map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setPersonalInterests({
                    ...personalInterests,
                    languages: [...(personalInterests.languages || []), suggestion]
                  })}
                  className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Diet Preferences */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <Utensils size={18} className="text-coral" />
            Preferências Alimentares
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newDiet}
              onChange={(e) => setNewDiet(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddPersonalItem(newDiet, setNewDiet, 'dietPreferences')}
              placeholder="Digite ou escolha abaixo"
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral"
            />
            <button
              onClick={() => handleAddPersonalItem(newDiet, setNewDiet, 'dietPreferences')}
              className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
          
          {personalInterests.dietPreferences && personalInterests.dietPreferences.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {personalInterests.dietPreferences.map(item => (
                <span key={item} className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm flex items-center gap-1">
                  {item}
                  <button onClick={() => handleRemovePersonalItem(item, 'dietPreferences')}>
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
          
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500 mb-2">Sugestões (clique para adicionar):</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.diet.filter(s => !personalInterests.dietPreferences?.includes(s)).map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setPersonalInterests({
                    ...personalInterests,
                    dietPreferences: [...(personalInterests.dietPreferences || []), suggestion]
                  })}
                  className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs hover:bg-teal-100 hover:text-teal-700 transition-colors"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={updateProfile.isPending}
          className="flex-1 px-6 py-3 bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {updateProfile.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save size={20} />
          )}
          Salvar Alterações
        </button>
        <button
          onClick={() => navigate('/perfil')}
          className="px-6 py-3 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};