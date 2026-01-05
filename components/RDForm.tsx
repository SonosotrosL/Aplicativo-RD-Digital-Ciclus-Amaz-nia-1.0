
import React, { useState, useEffect, useRef } from 'react';
import { ServiceCategory, RDData, RDStatus, AttendanceRecord, GeoLocation, User, ProductionMetrics, Employee, Base, Shift, UserRole } from '../types';
import { getEmployees, getUsers } from '../services/storageService';
import { MapPin, Users, Save, RefreshCw, CheckCircle, Camera, AlertTriangle, FileText, Clock, MapIcon, Search, ChevronDown, UserCheck, Calendar, RotateCcw, Lock, Plus, Trash2, Calculator, Loader2, Navigation, Image as ImageIcon, MapPinned, Crosshair } from 'lucide-react';

interface RDFormProps {
  currentUser: User;
  onSave: (data: RDData) => Promise<void>;
  onCancel: () => void;
  existingData?: RDData;
}

const getLocalDateString = (dateObj?: Date) => {
  const d = dateObj || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalTimeString = (dateObj?: Date) => {
    const d = dateObj || new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
};

export const RDForm: React.FC<RDFormProps> = ({ currentUser, onSave, onCancel, existingData }) => {
  // --- State ---
  const [rdDate, setRdDate] = useState<string>(
    existingData?.date ? existingData.date.split('T')[0] : getLocalDateString()
  );
  const [rdTime, setRdTime] = useState<string>(
    existingData?.date 
        ? new Date(existingData.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) 
        : getLocalTimeString()
  );

  const [base, setBase] = useState<Base>(existingData?.base || Base.NORTE);
  const [shift, setShift] = useState<Shift>(existingData?.shift || Shift.DIURNO);
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>(
    existingData?.serviceCategory || ServiceCategory.MUTIRAO
  );
  
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>(existingData?.supervisorId || '');
  const [availableSupervisors, setAvailableSupervisors] = useState<User[]>([]);

  const [street, setStreet] = useState(existingData?.street || '');
  const [neighborhood, setNeighborhood] = useState(existingData?.neighborhood || '');
  const [perimeter, setPerimeter] = useState(existingData?.perimeter || '');
  
  const [streetSuggestions, setStreetSuggestions] = useState<any[]>([]);
  const [hoodSuggestions, setHoodSuggestions] = useState<any[]>([]);
  const [isSearchingStreet, setIsSearchingStreet] = useState(false);
  const [isSearchingHood, setIsSearchingHood] = useState(false);

  const [nearbyStreets, setNearbyStreets] = useState<string[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [selectedPerimeterStreets, setSelectedPerimeterStreets] = useState<string[]>([]);

  const [metrics, setMetrics] = useState<ProductionMetrics>(existingData?.metrics || {
    capinaM: 0,
    pinturaViasM: 0,
    pinturaPostesUnd: 0,
    rocagemM2: 0
  });

  const [observations, setObservations] = useState(existingData?.observations || '');
  const [location, setLocation] = useState<GeoLocation | undefined>(existingData?.location);
  
  const [isLoadingLoc, setIsLoadingLoc] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(existingData?.teamAttendance || []);
  
  // 3-photo state
  const [photoInitial, setPhotoInitial] = useState<string>(existingData?.workPhotoInitial || '');
  const [photoProgress, setPhotoProgress] = useState<string>(existingData?.workPhotoProgress || '');
  const [photoFinal, setPhotoFinal] = useState<string>(existingData?.workPhotoFinal || '');
  
  const initialInputRef = useRef<HTMLInputElement>(null);
  const progressInputRef = useRef<HTMLInputElement>(null);
  const finalInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const loadInitialData = async () => {
        const allUsers = await getUsers();
        const sups = allUsers.filter(u => u.role === UserRole.SUPERVISOR);
        setAvailableSupervisors(sups);

        if (currentUser.role === UserRole.SUPERVISOR) {
            setSelectedSupervisorId(currentUser.id);
        }

        if (existingData) return;

        const allEmployees = await getEmployees();
        let myTeam = allEmployees.filter(e => e.supervisorId === currentUser.id);
        if (myTeam.length === 0) myTeam = allEmployees;

        const initialAttendance: AttendanceRecord[] = myTeam.map(e => ({
            employeeId: e.id,
            name: e.name,
            registration: e.registration,
            role: e.role,
            present: true
        }));
        setAttendance(initialAttendance);
        
        handleCaptureLocation();
    };
    loadInitialData();
  }, [currentUser, existingData]);

  const searchAddress = async (query: string, type: 'street' | 'hood') => {
    if (query.length < 4) {
      if (type === 'street') setStreetSuggestions([]);
      else setHoodSuggestions([]);
      return;
    }

    if (type === 'street') setIsSearchingStreet(true);
    else setIsSearchingHood(true);

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&countrycodes=br&limit=5`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (type === 'street') setStreetSuggestions(data);
        else setHoodSuggestions(data);
      }
    } catch (e) {
      console.warn("Search error", e);
    } finally {
      setIsSearchingStreet(false);
      setIsSearchingHood(false);
    }
  };

  const handleStreetChange = (val: string) => {
    setStreet(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchAddress(val, 'street'), 600);
  };

  const handleHoodChange = (val: string) => {
    setNeighborhood(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchAddress(val, 'hood'), 600);
  };

  const selectStreetSuggestion = (item: any) => {
    const foundStreet = item.address.road || item.address.pedestrian || item.address.street || item.display_name.split(',')[0];
    const foundHood = item.address.suburb || item.address.neighbourhood || item.address.city_district || '';
    
    setStreet(foundStreet);
    if (foundHood) setNeighborhood(foundHood);
    setStreetSuggestions([]);
    
    if (item.lat && item.lon) {
      setLocation({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        timestamp: Date.now(),
        addressFromGPS: item.display_name
      });
      fetchNearbyStreets(parseFloat(item.lat), parseFloat(item.lon), foundStreet);
    }
  };

  const selectHoodSuggestion = (item: any) => {
    const foundHood = item.address.suburb || item.address.neighbourhood || item.address.city_district || item.display_name.split(',')[0];
    setNeighborhood(foundHood);
    setHoodSuggestions([]);
  };

  const fetchNearbyStreets = async (lat: number, lng: number, currentStreetName: string) => {
    if (!lat || !lng) return;
    setIsLoadingNearby(true);
    setNearbyStreets([]);
    try {
        const query = `
            [out:json][timeout:25];
            (
              way["highway"]["name"](around:500,${lat},${lng});
            );
            out tags;
        `;
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            const names = new Set<string>();
            data.elements.forEach((el: any) => {
                if (el.tags && el.tags.name) {
                     const t = el.tags.highway;
                     if (t !== 'motorway' && t !== 'trunk') {
                         names.add(el.tags.name);
                     }
                }
            });
            const currentNorm = currentStreetName ? currentStreetName.toLowerCase().trim() : '';
            const sorted = Array.from(names)
                .filter(n => {
                    const nameLower = n.toLowerCase();
                    return !currentNorm || !nameLower.includes(currentNorm);
                })
                .sort();
            setNearbyStreets(sorted.slice(0, 30));
        }
    } catch (e) {
        console.warn("Overpass API error", e);
    } finally {
        setIsLoadingNearby(false);
    }
  };

  const fetchAddressReverse = async (lat: number, lng: number): Promise<{street: string, hood: string, full: string} | null> => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); 
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
            { signal: controller.signal }
        );
        clearTimeout(timeoutId);
        if (response.ok) {
            const data = await response.json();
            if (data && data.address) {
                const addr = data.address;
                const foundStreet = addr.road || addr.street || addr.pedestrian || addr.path || addr.living_street || addr.residential || addr.highway || '';
                const foundHood = addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter || addr.district || addr.hamlet || addr.village || addr.town || addr.city || '';
                if (foundStreet || foundHood) return { street: foundStreet, hood: foundHood, full: data.display_name };
            }
        }
    } catch (e) { console.warn("Reverse failed", e); }
    return null;
  };

  const handleCaptureLocation = () => {
    if (!('geolocation' in navigator)) { return; }
    
    setIsLoadingLoc(true);
    setGpsAccuracy(undefined);

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 15000, 
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy;
      setGpsAccuracy(accuracy);

      const result = await fetchAddressReverse(lat, lng);
      
      const locData: GeoLocation = {
        lat,
        lng,
        accuracy,
        timestamp: position.timestamp,
        addressFromGPS: result?.full || "Coordenadas capturadas via GPS"
      };
      
      setLocation(locData);
      
      if (result) {
        if (!street) setStreet(result.street);
        if (!neighborhood) setNeighborhood(result.hood);
        fetchNearbyStreets(lat, lng, result.street || '');
      }
      
      setIsLoadingLoc(false);
    }, (err) => {
      setIsLoadingLoc(false);
      console.warn("GPS failed", err);
    }, geoOptions);
  };

  const handleAddPerimeterStreet = (streetName: string) => {
    let newSelection = [...selectedPerimeterStreets];
    if (newSelection.includes(streetName)) {
        newSelection = newSelection.filter(s => s !== streetName);
    } else {
        newSelection.push(streetName);
    }
    if (newSelection.length > 2) {
        newSelection = [streetName];
        setPerimeter(`Esquina com ${streetName}`);
    } else if (newSelection.length === 2) {
        setPerimeter(`Entre ${newSelection[0]} e ${newSelection[1]}`);
    } else if (newSelection.length === 1) {
        setPerimeter(`Esquina com ${newSelection[0]}`);
    } else {
        setPerimeter('');
    }
    setSelectedPerimeterStreets(newSelection);
  };

  const handleCorrectionClick = (streetName: string) => {
      setStreet(streetName);
      if (location) fetchNearbyStreets(location.lat, location.lng, streetName);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'initial' | 'progress' | 'final') => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              if (type === 'initial') setPhotoInitial(reader.result as string);
              else if (type === 'progress') setPhotoProgress(reader.result as string);
              else if (type === 'final') setPhotoFinal(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const togglePresence = (index: number) => {
    const newAttendance = [...attendance];
    newAttendance[index].present = !newAttendance[index].present;
    setAttendance(newAttendance);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupervisorId) {
        alert("Erro: Supervisor Responsável não identificado.");
        return;
    }

    const sup = availableSupervisors.find(u => u.id === selectedSupervisorId);
    
    const totalProduction = metrics.capinaM + metrics.pinturaViasM + metrics.pinturaPostesUnd + metrics.rocagemM2;
    if (totalProduction <= 0 && observations.trim() === '') {
      alert("Insira a quantidade produzida ou uma observação.");
      return;
    }

    if (!photoInitial || !photoProgress || !photoFinal) {
        alert("Por favor, anexe as três fotos obrigatórias (Inicial, Progresso e Final).");
        return;
    }

    setIsSaving(true);
    const combinedDateStr = `${rdDate}T${rdTime}:00`;
    const finalDate = new Date(combinedDateStr);
    
    const rdToSave: RDData = {
      id: existingData?.id || ``, 
      date: finalDate.toISOString(),
      foremanId: existingData?.foremanId || currentUser.id,
      foremanName: existingData?.foremanName || currentUser.name,
      foremanRegistration: existingData?.foremanRegistration || currentUser.registration,
      supervisorId: selectedSupervisorId,
      supervisorName: sup?.name || '',
      status: RDStatus.PENDING,
      base,
      shift,
      serviceCategory,
      street,
      neighborhood,
      perimeter,
      metrics,
      location,
      segments: existingData?.segments || [],
      teamAttendance: attendance,
      workPhotoInitial: photoInitial,
      workPhotoProgress: photoProgress,
      workPhotoFinal: photoFinal,
      observations,
      createdAt: existingData?.createdAt || Date.now()
    };
    await onSave(rdToSave);
    setIsSaving(false);
  };

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-10">
      <div className="bg-ciclus-700 p-4 text-white flex justify-between items-center sticky top-0 z-10">
        <h2 className="text-lg font-bold">{existingData ? 'Edição de Relatório' : 'Novo Relatório Diário'}</h2>
        <span className="text-xs bg-ciclus-800 px-2 py-1 rounded font-mono">{currentUser.name} (Mat: {currentUser.registration})</span>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        
        {(currentUser.role !== UserRole.SUPERVISOR || existingData) && (
            <section className="bg-yellow-50 p-4 rounded border border-yellow-200">
                <label className="block text-sm font-bold text-yellow-800 mb-2 flex items-center gap-2"><UserCheck className="w-4 h-4" /> Supervisor Responsável</label>
                <select required value={selectedSupervisorId} onChange={e => setSelectedSupervisorId(e.target.value)} className="w-full p-2 border border-yellow-300 rounded bg-white text-gray-700 focus:ring-2 focus:ring-ciclus-500 outline-none">
                    <option value="">Selecione o Supervisor...</option>
                    {availableSupervisors.map(s => <option key={s.id} value={s.id}>{s.name} (Mat: {s.registration})</option>)}
                </select>
            </section>
        )}

        <section>
          <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> 1. Dados Operacionais</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div><label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Data</label><input type="date" required value={rdDate} onChange={e => setRdDate(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded-md font-bold text-gray-700 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ciclus-500 outline-none" /></div>
             <div><label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Horário</label><input type="time" required value={rdTime} onChange={e => setRdTime(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded-md font-bold text-gray-700 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ciclus-500 outline-none" /></div>
             <div><label className="block text-xs font-medium text-gray-600 mb-1">Base Operacional</label><select value={base} onChange={e => setBase(e.target.value as Base)} className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-ciclus-500 outline-none">{Object.values(Base).map((b) => <option key={b} value={b}>{b}</option>)}</select></div>
             <div><label className="block text-xs font-medium text-gray-600 mb-1">Turno</label><select value={shift} onChange={e => setShift(e.target.value as Shift)} className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-ciclus-500 outline-none">{Object.values(Shift).map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
          </div>
        </section>

        <section className="border-t border-gray-100 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase flex items-center gap-2"><MapPin className="w-4 h-4" /> 2. Localização</h3>
            {gpsAccuracy && <span className={`text-[10px] ${gpsAccuracy > 30 ? 'text-red-500 font-bold' : 'text-green-600'}`}>Precisão: {gpsAccuracy.toFixed(0)}m</span>}
          </div>

          <div className="relative rounded-xl border border-gray-200 overflow-hidden shadow-inner bg-gray-50 mb-6">
            <div className="h-48 w-full relative">
              {location ? (
                <iframe 
                  title="Localização do Serviço"
                  width="100%" 
                  height="100%" 
                  frameBorder="0" 
                  scrolling="no" 
                  marginHeight={0} 
                  marginWidth={0} 
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng-0.005},${location.lat-0.005},${location.lng+0.005},${location.lat+0.005}&layer=mapnik&marker=${location.lat},${location.lng}`}
                  className="opacity-90 grayscale-[0.2]"
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-ciclus-500" />
                  <p className="text-xs font-medium uppercase tracking-widest">Buscando sinal de GPS...</p>
                </div>
              )}
              
              <button 
                type="button" 
                onClick={handleCaptureLocation}
                disabled={isLoadingLoc}
                className="absolute top-3 right-3 bg-white p-2 rounded-lg shadow-md hover:bg-gray-100 transition-colors border border-gray-200"
              >
                {isLoadingLoc ? <Loader2 className="w-5 h-5 animate-spin text-ciclus-600" /> : <Crosshair className="w-5 h-5 text-ciclus-600" />}
              </button>
            </div>
            
            <div className="bg-gray-800 text-white p-2 px-4 flex justify-between items-center">
              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-[8px] text-gray-400 uppercase font-bold">Latitude</span>
                  <span className="text-xs font-mono">{location?.lat.toFixed(6) || "---"}</span>
                </div>
                <div className="flex flex-col border-l border-gray-700 pl-4">
                  <span className="text-[8px] text-gray-400 uppercase font-bold">Longitude</span>
                  <span className="text-xs font-mono">{location?.lng.toFixed(6) || "---"}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-gray-400 uppercase font-bold">Status do GPS</p>
                <div className="flex items-center gap-1 justify-end">
                  <div className={`w-1.5 h-1.5 rounded-full ${location ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500 animate-pulse'}`}></div>
                  <span className="text-[10px] font-bold">{location ? 'CONECTADO' : 'BUSCANDO'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="md:col-span-2 relative">
              <label className="block text-xs font-medium text-gray-500 uppercase flex justify-between">
                Rua / Logradouro
                {isSearchingStreet && <Loader2 className="w-3 h-3 animate-spin text-ciclus-500" />}
              </label>
              <input 
                required 
                type="text" 
                value={street} 
                onChange={e => handleStreetChange(e.target.value)} 
                placeholder="Nome da rua..." 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-3 focus:ring-ciclus-500 focus:border-ciclus-500 text-gray-700 font-medium outline-none" 
              />

              {streetSuggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl max-h-60 overflow-y-auto">
                  {streetSuggestions.map((item, idx) => (
                    <button 
                      key={idx} 
                      type="button" 
                      onClick={() => selectStreetSuggestion(item)}
                      className="w-full text-left p-3 hover:bg-ciclus-50 border-b border-gray-50 last:border-0"
                    >
                      <p className="text-sm font-bold text-gray-800">{item.display_name.split(',')[0]}</p>
                      <p className="text-[10px] text-gray-500 truncate">{item.display_name}</p>
                    </button>
                  ))}
                </div>
              )}
              
              {nearbyStreets.length > 0 && (
                  <div className="mt-2 animate-in fade-in bg-yellow-50 p-2 rounded border border-yellow-100">
                    <p className="text-[10px] text-yellow-700 mb-1 flex items-center gap-1 font-bold"><AlertTriangle className="w-3 h-3" /> Sugestões próximas:</p>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                        {nearbyStreets.map((st, i) => (
                            <button type="button" key={i} onClick={() => handleCorrectionClick(st)} className="text-[10px] px-2 py-1 rounded border transition-colors shadow-sm bg-white text-gray-600 border-gray-200 hover:bg-yellow-100 hover:text-yellow-800 hover:border-yellow-300">
                                {st}
                            </button>
                        ))}
                    </div>
                  </div>
              )}
            </div>
            
            <div className="md:col-span-1 relative">
              <label className="block text-xs font-medium text-gray-500 uppercase flex justify-between">
                Bairro
                {isSearchingHood && <Loader2 className="w-3 h-3 animate-spin text-ciclus-500" />}
              </label>
              <input 
                required 
                type="text" 
                value={neighborhood} 
                onChange={e => handleHoodChange(e.target.value)} 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:ring-ciclus-500 focus:border-ciclus-500 outline-none" 
              />
              
              {hoodSuggestions.length > 0 && (
                <div className="absolute z-40 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl max-h-40 overflow-y-auto">
                  {hoodSuggestions.map((item, idx) => (
                    <button 
                      key={idx} 
                      type="button" 
                      onClick={() => selectHoodSuggestion(item)}
                      className="w-full text-left p-2 hover:bg-ciclus-50 border-b border-gray-50 last:border-0"
                    >
                      <p className="text-xs font-bold text-gray-800">{item.display_name.split(',')[0]}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-gray-500 uppercase">Perímetro / Referência</label>
              <input type="text" value={perimeter} onChange={e => setPerimeter(e.target.value)} placeholder="Ex: Entre Rua A e Rua B" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:ring-ciclus-500 focus:border-ciclus-500 outline-none" />
            </div>
          </div>
        </section>

        <section className="border-t border-gray-100 pt-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">3. Quantitativos de Produção</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div>
                  <label className="block text-xs font-bold text-gray-700">Capinação e Raspagem (m)</label>
                  <input type="number" min="0" step="0.1" value={metrics.capinaM || ''} onChange={e => setMetrics({...metrics, capinaM: parseFloat(e.target.value) || 0})} className="w-full p-2 border border-gray-300 rounded mt-1 font-mono text-lg focus:ring-2 focus:ring-ciclus-500 outline-none" placeholder="0.0" />
              </div>
              
              <div>
                  <label className="block text-xs font-bold text-gray-700">Roçagem (m²)</label>
                  <input type="number" min="0" step="0.1" value={metrics.rocagemM2 || ''} onChange={e => setMetrics({...metrics, rocagemM2: parseFloat(e.target.value) || 0})} className="w-full p-2 border border-gray-300 rounded mt-1 font-mono text-lg focus:ring-2 focus:ring-ciclus-500 outline-none" placeholder="0.0" />
              </div>
              
              <div>
                  <label className="block text-xs font-medium text-gray-600">Pintura de Vias (m)</label>
                  <input type="number" min="0" step="0.1" value={metrics.pinturaViasM || ''} onChange={e => setMetrics({...metrics, pinturaViasM: parseFloat(e.target.value) || 0})} className="w-full p-2 border border-gray-300 rounded mt-1 font-mono text-lg focus:ring-2 focus:ring-ciclus-500 outline-none" placeholder="0.0" />
              </div>
              
              <div>
                  <label className="block text-xs font-medium text-gray-600">Pintura de Postes (Unid)</label>
                  <input type="number" min="0" step="1" value={metrics.pinturaPostesUnd || ''} onChange={e => setMetrics({...metrics, pinturaPostesUnd: parseFloat(e.target.value) || 0})} className="w-full p-2 border border-gray-300 rounded mt-1 font-mono text-lg focus:ring-2 focus:ring-ciclus-500 outline-none" placeholder="0" />
              </div>
          </div>
        </section>

        <section className="border-t border-gray-100 pt-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-gray-400 uppercase flex items-center gap-2"><Users className="w-4 h-4" /> 4. Frequência da Equipe</h3>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded font-bold">{attendance.filter(a => a.present).length} / {attendance.length} Presentes</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
             {attendance.length === 0 ? <div className="p-4 text-center text-gray-400 text-sm">Nenhum colaborador vinculado.</div> : 
               attendance.map((record, idx) => (
                 <div key={record.employeeId} className="flex items-center justify-between p-3 hover:bg-gray-50">
                    <div><p className="font-medium text-gray-800 text-sm">{record.name} <span className="text-gray-400 font-normal ml-1">(Mat: {record.registration})</span></p><p className="text-[10px] text-gray-400 uppercase">{record.role}</p></div>
                    <label className="flex items-center cursor-pointer relative"><input type="checkbox" checked={record.present} onChange={() => togglePresence(idx)} className="sr-only peer" /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ciclus-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ciclus-600"></div></label>
                 </div>
               ))
             }
          </div>
        </section>

        <section className="border-t border-gray-100 pt-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 flex items-center gap-2"><FileText className="w-4 h-4" /> 5. Observações</h3>
          <textarea value={observations} onChange={e => setObservations(e.target.value)} placeholder="Ocorrências do dia..." className="w-full rounded-md border-gray-300 shadow-sm border p-3 h-24 text-sm focus:ring-2 focus:ring-ciclus-500 outline-none" />
        </section>

        <section className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> 6. Comprovação por Fotos</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Foto Inicial */}
                <div onClick={() => initialInputRef.current?.click()} className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-colors ${photoInitial ? 'border-ciclus-500 bg-ciclus-50' : 'border-gray-300 hover:bg-gray-50'}`}>
                    <input ref={initialInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoUpload(e, 'initial')} />
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">1. Foto Inicial</p>
                    {photoInitial ? (
                        <div className="relative w-full">
                            <img src={photoInitial} alt="Inicial" className="w-full h-32 object-cover rounded shadow-sm" />
                        </div>
                    ) : (
                        <><Camera className="w-8 h-8 text-gray-300 mb-1" /><p className="text-[10px] text-gray-500">Toque para tirar</p></>
                    )}
                </div>

                {/* Foto Progresso */}
                <div onClick={() => progressInputRef.current?.click()} className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-colors ${photoProgress ? 'border-ciclus-500 bg-ciclus-50' : 'border-gray-300 hover:bg-gray-50'}`}>
                    <input ref={progressInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoUpload(e, 'progress')} />
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">2. Foto Progresso</p>
                    {photoProgress ? (
                        <div className="relative w-full">
                            <img src={photoProgress} alt="Progresso" className="w-full h-32 object-cover rounded shadow-sm" />
                        </div>
                    ) : (
                        <><Camera className="w-8 h-8 text-gray-300 mb-1" /><p className="text-[10px] text-gray-500">Toque para tirar</p></>
                    )}
                </div>

                {/* Foto Final */}
                <div onClick={() => finalInputRef.current?.click()} className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-colors ${photoFinal ? 'border-ciclus-500 bg-ciclus-50' : 'border-gray-300 hover:bg-gray-50'}`}>
                    <input ref={finalInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoUpload(e, 'final')} />
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">3. Foto Final</p>
                    {photoFinal ? (
                        <div className="relative w-full">
                            <img src={photoFinal} alt="Final" className="w-full h-32 object-cover rounded shadow-sm" />
                        </div>
                    ) : (
                        <><Camera className="w-8 h-8 text-gray-300 mb-1" /><p className="text-[10px] text-gray-500">Toque para tirar</p></>
                    )}
                </div>
            </div>
        </section>

        <div className="flex gap-3 pt-4 sticky bottom-0 bg-white p-4 border-t mt-6 -mx-6 -mb-6 z-10">
          <button type="button" onClick={onCancel} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors">Cancelar</button>
          <button type="submit" disabled={isSaving} className="flex-1 bg-ciclus-600 text-white py-3 rounded-lg font-bold hover:bg-ciclus-700 shadow-lg flex justify-center items-center gap-2 disabled:opacity-50 transition-all active:scale-95">
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isSaving ? 'Enviando...' : existingData ? 'Salvar Alterações' : 'Enviar RD'}
          </button>
        </div>
      </form>
    </div>
  );
};
