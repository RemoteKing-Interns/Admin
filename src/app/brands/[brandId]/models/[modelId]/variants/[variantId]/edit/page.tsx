'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiLoader, FiTrash2, FiUpload, FiX } from 'react-icons/fi';

interface VariantData {
  _id: string;
  name: string;
  rkid?: string;
  imageUrl?: string;
  images?: { car?: string };
  brandId: string;
  modelId: string;
  vehicleInfo?: {
    make?: string;
    model?: string;
    series?: string;
    yearRange?: string;
    keyType?: string;
    remoteFrequency?: string;
    Lishi?: string;
    LishiLink?: string;
    transponderChip?: string[];
    transponderChipLinks?: string[];
    KingParts?: string[];
    KingPartsLinks?: string[];
  };
  keyBladeProfiles?: Record<string, { refNo?: string; link?: string }>;
  programmingInfo?: {
    remoteOptions?: Array<{ name?: string; models?: string[]; Color?: string }>;
    keyBladeOptions?: Array<{ name?: string; models?: string[]; Color?: string }>;
    cloningOptions?: Array<{ name?: string; models?: string[]; Color?: string }>;
    allKeysLost?: Array<{ name?: string; models?: string[]; Color?: string }>;
    addSpareKey?: Array<{ name?: string; models?: string[]; Color?: string }>;
    addRemote?: Array<{ name?: string; models?: string[]; Color?: string }>;
    pinRequired?: Array<{ name?: string; models?: string[]; Color?: string }>;
    pinReading?: Array<{ name?: string; models?: string[]; Color?: string }>;
    remoteProgramming?: Array<{ name?: string; models?: string[]; Color?: string }>;
  };
  pathways?: Array<{ name?: string; path?: string }>;
  resources?: {
    quickReference?: { emergencyStart?: string; obdPortLocation?: string };
    videos?: Array<{ title?: string; embedId?: string }>;
    documents?: Array<{ title?: string; link?: string }>;
  };
}

interface BrandInfo { _id: string; name: string }
interface ModelInfo { _id: string; name: string }

export default function EditVariantPage() {
  const router = useRouter();
  const { brandId, modelId, variantId } = useParams<{ brandId: string; modelId: string; variantId: string }>();

  const [name, setName] = useState('');
  const [rkid, setRkid] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [brand, setBrand] = useState<BrandInfo | null>(null);
  const [model, setModel] = useState<ModelInfo | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [targetModelId, setTargetModelId] = useState<string>('');

  // Programming Info state and helpers
  type ProgOption = { name: string; Color: string; models: string[]; modelsInput?: string };
  const [programmingInfo, setProgrammingInfo] = useState({
    remoteOptions: [] as ProgOption[],
    keyBladeOptions: [] as ProgOption[],
    cloningOptions: [] as ProgOption[],
    allKeysLost: [] as ProgOption[],
    addSpareKey: [] as ProgOption[],
    addRemote: [] as ProgOption[],
    pinRequired: [] as ProgOption[],
    pinReading: [] as ProgOption[],
    remoteProgramming: [] as ProgOption[],
  });
  const updateArrayItem = <T,>(arr: T[], idx: number, next: Partial<T>): T[] =>
    arr.map((it, i) => (i === idx ? { ...(it as any), ...(next as any) } : it));
  const removeArrayItem = <T,>(arr: T[], idx: number): T[] => arr.filter((_, i) => i !== idx);
  const isHexColor = (s: string) => /^#([0-9A-Fa-f]{6})$/.test(s || '');
  const getColorPickerValue = (s: string) => (isHexColor(s) ? s : '#000000');

  // Legend: distinct option names and their colors aggregated from programmingInfo
  const legend = useMemo(() => {
    const colorLists = new Map<string, string[]>();
    const groups = Object.values(programmingInfo) as ProgOption[][];
    groups.forEach((list) =>
      list.forEach((opt) => {
        const name = (opt?.name || '').trim();
        if (!name) return;
        const color = (opt?.Color || '').trim();
        const arr = colorLists.get(name) || [];
        if (color) arr.push(color);
        colorLists.set(name, arr);
      })
    );
    const pickColor = (arr: string[]) => {
      if (!arr || arr.length === 0) return '';
      const hex = arr.find((c) => isHexColor(c));
      return hex || arr[0];
    };
    return Array.from(colorLists.entries())
      .map(([name, colors]) => ({ name, color: pickColor(colors) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [programmingInfo]);

  const applyLegendColor = (legendName: string, hex: string) => {
    setProgrammingInfo((pi) => {
      const entries = Object.entries(pi).map(([k, list]) => {
        const next = (list as ProgOption[]).map((o) =>
          (o.name || '').trim() === legendName ? { ...o, Color: hex } : o
        );
        return [k, next] as const;
      });
      return Object.fromEntries(entries) as typeof pi;
    });
  };

  // Sections configuration for Programming Info
  const progSections = [
    ['remoteOptions', 'Remote Options'],
    ['keyBladeOptions', 'Key Blade Options'],
    ['cloningOptions', 'Cloning Options'],
    ['allKeysLost', 'All Keys Lost'],
    ['addSpareKey', 'Add Spare Key'],
    ['addRemote', 'Add Remote'],
    ['pinRequired', 'PIN Required'],
    ['pinReading', 'PIN Reading'],
    ['remoteProgramming', 'Remote Programming'],
  ] as const;

  // Vehicle Info state
  const [vehicleInfo, setVehicleInfo] = useState({
    make: '',
    model: '',
    series: '',
    yearRange: '',
    keyType: '',
    remoteFrequency: '',
    Lishi: '',
    LishiLink: '',
    transponderChip: [] as string[],
    transponderChipLinks: [] as string[],
    KingParts: [] as string[],
    KingPartsLinks: [] as string[],
  });

  // Key Blade Profiles (array for UI)
  type KeyBladeProfile = { name: string; refNo: string; link: string };
  const [keyBladeProfiles, setKeyBladeProfiles] = useState<KeyBladeProfile[]>([]);

  // Pathways and Resources
  const [pathways, setPathways] = useState<{ name: string; path: string }[]>([]);
  const [resources, setResources] = useState({
    quickReference: { emergencyStart: '', obdPortLocation: '' },
    videos: [] as { title: string; embedId: string }[],
    documents: [] as { title: string; link: string }[],
  });


  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Load current data
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError('');

        const [variantRes, brandRes, modelRes, modelsRes] = await Promise.all([
          fetch(`/api/brands/${brandId}/models/${modelId}/variants/${variantId}`),
          fetch(`/api/brands/${brandId}`),
          fetch(`/api/brands/${brandId}/models/${modelId}`),
          fetch(`/api/brands/${brandId}/models`),
        ]);

        if (!variantRes.ok) throw new Error('Failed to fetch variant');
        const variant: VariantData = await variantRes.json();
        setName(variant.name || '');
        setRkid(variant.rkid || '');
        const existing = variant.images?.car || variant.imageUrl || '';
        setCurrentImageUrl(existing);
        setTargetModelId(variant.modelId || (modelId as string));

        // Initialize programming info with modelsInput for UX
        const pi = variant.programmingInfo || {};
        const withInput = (list?: Array<{ name?: string; Color?: string; models?: string[] }>): ProgOption[] =>
          (list || []).map((o) => ({
            name: o.name || '',
            Color: o.Color || '',
            models: Array.isArray(o.models) ? o.models : [],
            modelsInput: Array.isArray(o.models) ? o.models.join(', ') : '',
          }));
        setProgrammingInfo({
          remoteOptions: withInput(pi.remoteOptions),
          keyBladeOptions: withInput(pi.keyBladeOptions),
          cloningOptions: withInput(pi.cloningOptions),
          allKeysLost: withInput(pi.allKeysLost),
          addSpareKey: withInput(pi.addSpareKey),
          addRemote: withInput(pi.addRemote),
          pinRequired: withInput(pi.pinRequired),
          pinReading: withInput(pi.pinReading),
          remoteProgramming: withInput(pi.remoteProgramming),
        });

        // Vehicle Info
        const vi = variant.vehicleInfo || {};
        setVehicleInfo({
          make: vi.make || '',
          model: vi.model || '',
          series: vi.series || '',
          yearRange: vi.yearRange || '',
          keyType: vi.keyType || '',
          remoteFrequency: vi.remoteFrequency || '',
          Lishi: vi.Lishi || '',
          LishiLink: vi.LishiLink || '',
          transponderChip: Array.isArray(vi.transponderChip) ? vi.transponderChip : [],
          transponderChipLinks: Array.isArray(vi.transponderChipLinks) ? vi.transponderChipLinks : [],
          KingParts: Array.isArray(vi.KingParts) ? vi.KingParts : [],
          KingPartsLinks: Array.isArray(vi.KingPartsLinks) ? vi.KingPartsLinks : [],
        });

        // Key Blade Profiles (record -> array)
        const kbpRec = variant.keyBladeProfiles || {};
        const kbpArr = Object.entries(kbpRec).map(([name, obj]) => ({
          name,
          refNo: (obj as any)?.refNo || '',
          link: (obj as any)?.link || '',
        }));
        setKeyBladeProfiles(kbpArr);

        // Pathways and Resources
        setPathways((variant.pathways || []).map((p) => ({ name: p.name || '', path: p.path || '' })) as any);
        setResources({
          quickReference: {
            emergencyStart: variant.resources?.quickReference?.emergencyStart || '',
            obdPortLocation: variant.resources?.quickReference?.obdPortLocation || '',
          },
          videos: (variant.resources?.videos || []).map((v) => ({ title: v.title || '', embedId: v.embedId || '' })),
          documents: (variant.resources?.documents || []).map((d) => ({ title: d.title || '', link: d.link || '' })),
        });

        if (brandRes.ok) setBrand(await brandRes.json());
        if (modelRes.ok) setModel(await modelRes.json());
        if (modelsRes.ok) setModels(await modelsRes.json());
      } catch (e) {
        console.error(e);
        setError('Failed to load variant data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (brandId && modelId && variantId) load();
  }, [brandId, modelId, variantId]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(f.type)) {
        setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setFile(f);
      setError('');
    }
  };

  // Preview object URL
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const obj = URL.createObjectURL(file);
    setPreviewUrl(obj);
    return () => URL.revokeObjectURL(obj);
  }, [file]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Variant name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let imageForVariant = currentImageUrl;

      if (file) {
        // Get presign
        const presign = await fetch('/api/uploads/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            brandName: name.trim(),
            folder: 'variants',
          }),
        });
        if (!presign.ok) throw new Error('Failed to get upload URL');
        const { url, fields } = await presign.json();

        const formData = new FormData();
        Object.entries(fields).forEach(([k, v]) => formData.append(k, v as string));
        formData.append('file', file);

        const uploadRes = await fetch(url, { method: 'POST', body: formData });
        if (!uploadRes.ok) throw new Error('Failed to upload file');

        const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME || 'remoteking';
        const region = process.env.NEXT_PUBLIC_S3_REGION || 'ap-southeast-2';
        imageForVariant = `https://${bucketName}.s3.${region}.amazonaws.com/${fields.key}`;
      }

      // Build programmingInfo with defaults and strip UI-only fields
      const ensureDefaults = (opt: ProgOption) => ({
        name: (opt.name && opt.name.trim()) ? opt.name.trim() : 'Not Applicable',
        Color: (opt.Color && opt.Color.trim()) ? opt.Color.trim() : 'Not Applicable',
        models: (opt.models && opt.models.length > 0) ? opt.models : ['Not Applicable'],
      });
      const cleanProgrammingInfo: any = Object.fromEntries(
        Object.entries(programmingInfo).map(([k, list]) => {
          const arr = list as ProgOption[];
          if (!arr || arr.length === 0) return [k, [ensureDefaults({ name: '', Color: '', models: [] })]];
          return [k, arr.map(ensureDefaults)];
        })
      );

      // Update variant
      const res = await fetch(`/api/brands/${brandId}/models/${modelId}/variants/${variantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          rkid: rkid.trim() || undefined,
          images: { car: imageForVariant },
          imageUrl: imageForVariant, // keep for backward compatibility
          programmingInfo: cleanProgrammingInfo,
          vehicleInfo,
          keyBladeProfiles: keyBladeProfiles.reduce((acc, p) => {
            if (!p.name) return acc;
            acc[p.name] = { refNo: p.refNo || undefined, link: p.link || undefined };
            return acc;
          }, {} as Record<string, { refNo?: string; link?: string }>),
          pathways,
          resources,
          newModelId: targetModelId && targetModelId !== (modelId as string) ? targetModelId : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update variant');
      }

      // Back to variants list (respect new model if moved)
      const destModelId = targetModelId && targetModelId !== (modelId as string) ? targetModelId : (modelId as string);
      router.push(`/brands/${brandId}/models/${destModelId}`);
      router.refresh();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to update variant. Please try again.');
      if (errorRef.current) errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError('');

      const res = await fetch(`/api/brands/${brandId}/models/${modelId}/variants/${variantId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete variant');

      router.push(`/brands/${brandId}/models/${modelId}`);
      router.refresh();
    } catch (e) {
      console.error(e);
      setError('Failed to delete variant. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <Link href={`/brands/${brandId}/models/${modelId}`} className="flex items-center text-gray-600 hover:text-gray-900 mb-2">
              <FiArrowLeft className="mr-2" /> Back to Variants
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-secondary-900 mb-2">Edit Variant</h1>
              {(brand || model) && (
                <p className="text-gray-600">
                  {brand ? <span className="font-medium">{brand.name}</span> : 'Brand'} / {model ? <span className="font-medium">{model.name}</span> : 'Model'}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            disabled={isSubmitting}
            className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <FiTrash2 className="mr-2 h-4 w-4" />
            Delete Variant
          </button>
        </div>

        {error && (
          <div ref={errorRef} className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6" role="alert">
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Variant Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              maxLength={120}
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">RK ID</label>
            <input
              className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={rkid}
              onChange={(e) => setRkid(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Move to another model within the same brand */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Move to Model</label>
            <select
              className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={targetModelId}
              onChange={(e) => setTargetModelId(e.target.value)}
              disabled={isSubmitting || models.length === 0}
            >
              {models.map((m) => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Changing this will move the variant under the selected model upon save.</p>
          </div>

          <div className="space-y-6">
            {currentImageUrl && !previewUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Image</label>
                <div className="mt-1 flex flex-col items-center p-4 border border-gray-200 rounded-md bg-gray-50">
                  <div className="relative">
                    <img
                      src={currentImageUrl}
                      alt="Current image"
                      className="h-32 w-auto object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://via.placeholder.com/200x100?text=Image+Not+Found';
                      }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">This is the current image used for the variant</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{currentImageUrl ? 'Upload New Image' : 'Variant Image'}</label>
              <div
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
                  error && !file && !currentImageUrl ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-primary-500'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="space-y-1 text-center">
                  {file ? (
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <img src={previewUrl || ''} alt="New image preview" className="h-32 w-auto object-contain" />
                        <button
                          type="button"
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                            setPreviewUrl(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                        >
                          <FiX className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">Click to change the image</p>
                    </div>
                  ) : (
                    <>
                      <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600 justify-center">
                        <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none">
                          <span>Upload a file</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            disabled={isSubmitting}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Vehicle Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([
                ['make','Make'],['model','Model'],['series','Series'],['yearRange','Year Range'],['keyType','Key Type'],['remoteFrequency','Remote Frequency'],['Lishi','Lishi Tool'],['LishiLink','Lishi Link']
              ] as const).map(([k, label]) => (
                <div key={k}>
                  <label className="block text-sm text-gray-700 mb-1">{label}</label>
                  <input
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500"
                    value={(vehicleInfo as any)[k] || ''}
                    onChange={(e)=>setVehicleInfo(v=>({ ...v, [k]: e.target.value }))}
                    disabled={isSubmitting}
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {([
                ['transponderChip','Transponder Chips'],
                ['transponderChipLinks','Transponder Chip Links'],
                ['KingParts','King Parts'],
                ['KingPartsLinks','King Parts Links'],
              ] as const).map(([k, label]) => (
                <div key={k}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">{label}</label>
                    <button type="button" className="text-primary-600" onClick={()=>setVehicleInfo(v=>({ ...v, [k]: [...(v as any)[k], ''] }))}>+ Add</button>
                  </div>
                  <div className="space-y-2">
                    {(vehicleInfo as any)[k].map((val: string, idx: number) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500"
                          value={val}
                          onChange={(e)=>setVehicleInfo(v=>{ const next = [...(v as any)[k]]; next[idx]=e.target.value; return { ...v, [k]: next }; })}
                        />
                        <button type="button" className="text-red-600" onClick={()=>setVehicleInfo(v=>{ const next = [...(v as any)[k]]; next.splice(idx,1); return { ...v, [k]: next }; })}>Remove</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Blade Profiles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Key Blade Profiles</h2>
              <button type="button" className="text-primary-600" onClick={()=>setKeyBladeProfiles((l)=>[...l,{ name:'', refNo:'', link:'' }])}>+ Add Profile</button>
            </div>
            {keyBladeProfiles.length === 0 && <p className="text-sm text-gray-500">No profiles added.</p>}
            <div className="space-y-3">
              {keyBladeProfiles.map((p, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input className="px-3 py-2 border rounded-md" placeholder="Profile Name"
                    value={p.name} onChange={(e)=>setKeyBladeProfiles(updateArrayItem(keyBladeProfiles, idx, { name:e.target.value }))} />
                  <input className="px-3 py-2 border rounded-md" placeholder="Ref No"
                    value={p.refNo} onChange={(e)=>setKeyBladeProfiles(updateArrayItem(keyBladeProfiles, idx, { refNo:e.target.value }))} />
                  <input className="px-3 py-2 border rounded-md" placeholder="Link"
                    value={p.link} onChange={(e)=>setKeyBladeProfiles(updateArrayItem(keyBladeProfiles, idx, { link:e.target.value }))} />
                  <button type="button" className="text-red-600" onClick={()=>setKeyBladeProfiles(removeArrayItem(keyBladeProfiles, idx))}>Remove</button>
                </div>
              ))}
            </div>
          </div>

          {/* Programming Info */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Programming Info</h2>
            {legend.length > 0 && (
              <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                <div className="text-sm font-medium mb-2">Legend (Names & Colors)</div>
                <div className="flex flex-wrap gap-3">
                  {legend.map((it) => (
                    <div key={it.name} className="flex items-center gap-3 px-3 py-2 border rounded bg-white">
                      <span
                        className="inline-block h-4 w-4 rounded border border-gray-300"
                        style={{ backgroundColor: isHexColor(it.color) ? it.color : undefined }}
                        title={it.color}
                      />
                      <span className="text-sm font-medium text-gray-900 min-w-[120px] truncate" title={it.name}>{it.name}</span>
                      <input
                        type="color"
                        className="h-8 w-10 p-0 border border-gray-300 rounded"
                        value={isHexColor(it.color) ? it.color : '#000000'}
                        onChange={(e) => applyLegendColor(it.name, e.target.value)}
                      />
                      {it.color && !isHexColor(it.color) && (
                        <span className="text-xs text-gray-500">({it.color})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {progSections.map(([groupKey, label]) => (
              <div key={groupKey} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">{label}</label>
                  <button
                    type="button"
                    className="text-primary-600"
                    onClick={() =>
                      setProgrammingInfo((pi) => ({
                        ...pi,
                        [groupKey]: [...((pi as any)[groupKey] as ProgOption[]), { name: '', Color: '', models: [], modelsInput: '' }],
                      }))
                    }
                  >
                    + Add
                  </button>
                </div>
                {((programmingInfo as any)[groupKey] as ProgOption[]).length === 0 && (
                  <p className="text-sm text-gray-500">No items added.</p>
                )}
                {((programmingInfo as any)[groupKey] as ProgOption[]).map((opt: ProgOption, idx: number) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-8 gap-3">
                    <input
                      className="px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 md:col-span-2 min-w-0"
                      placeholder="Name"
                      value={opt.name}
                      onChange={(e) =>
                        setProgrammingInfo((pi) => {
                          const next = updateArrayItem(((pi as any)[groupKey] as ProgOption[]), idx, { name: e.target.value });
                          return { ...pi, [groupKey]: next } as any;
                        })
                      }
                    />
                    <div className="flex items-center gap-2 md:col-span-2 min-w-0 overflow-hidden">
                      <input
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500"
                        placeholder="Color name or hex (#00FF00)"
                        value={opt.Color}
                        onChange={(e) =>
                          setProgrammingInfo((pi) => {
                            const next = updateArrayItem(((pi as any)[groupKey] as ProgOption[]), idx, { Color: e.target.value });
                            return { ...pi, [groupKey]: next } as any;
                          })
                        }
                      />
                      <input
                        type="color"
                        className="h-10 w-10 p-0 border border-gray-300 rounded-md shrink-0"
                        value={getColorPickerValue(opt.Color)}
                        onChange={(e) =>
                          setProgrammingInfo((pi) => {
                            const next = updateArrayItem(((pi as any)[groupKey] as ProgOption[]), idx, { Color: e.target.value });
                            return { ...pi, [groupKey]: next } as any;
                          })
                        }
                      />
                    </div>
                    <input
                      className="px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 md:col-span-3 min-w-0"
                      placeholder="Models (comma separated)"
                      value={opt.modelsInput ?? opt.models.join(', ')}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
                        setProgrammingInfo((pi) => {
                          const next = updateArrayItem(((pi as any)[groupKey] as ProgOption[]), idx, { models: parts, modelsInput: raw });
                          return { ...pi, [groupKey]: next } as any;
                        });
                      }}
                      onBlur={(e) => {
                        const raw = e.target.value;
                        const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
                        setProgrammingInfo((pi) => {
                          const next = updateArrayItem(((pi as any)[groupKey] as ProgOption[]), idx, { models: parts, modelsInput: parts.join(', ') });
                          return { ...pi, [groupKey]: next } as any;
                        });
                      }}
                    />
                    <button
                      type="button"
                      className="text-red-600"
                      onClick={() =>
                        setProgrammingInfo((pi) => {
                          const next = removeArrayItem(((pi as any)[groupKey] as ProgOption[]), idx);
                          return { ...pi, [groupKey]: next } as any;
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Pathways */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Pathways</h2>
              <button type="button" className="text-primary-600" onClick={()=>setPathways((l)=>[...l,{ name:'', path:'' }])}>+ Add Pathway</button>
            </div>
            {pathways.length === 0 && <p className="text-sm text-gray-500">No pathways added.</p>}
            <div className="space-y-3">
              {pathways.map((p, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input className="px-3 py-2 border rounded-md" placeholder="Name"
                    value={p.name} onChange={(e)=>setPathways(updateArrayItem(pathways, idx, { name:e.target.value }))} />
                  <input className="px-3 py-2 border rounded-md md:col-span-1" placeholder="Path"
                    value={p.path} onChange={(e)=>setPathways(updateArrayItem(pathways, idx, { path:e.target.value }))} />
                  <button type="button" className="text-red-600" onClick={()=>setPathways(removeArrayItem(pathways, idx))}>Remove</button>
                </div>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Resources</h2>
            {/* Quick Reference */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Emergency Start</label>
                <textarea className="w-full px-3 py-2 border rounded-md" rows={3}
                  value={resources.quickReference.emergencyStart}
                  onChange={(e)=>setResources(r=>({ ...r, quickReference:{ ...r.quickReference, emergencyStart: e.target.value } }))}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">OBD Port Location</label>
                <input className="w-full px-3 py-2 border rounded-md"
                  value={resources.quickReference.obdPortLocation}
                  onChange={(e)=>setResources(r=>({ ...r, quickReference:{ ...r.quickReference, obdPortLocation: e.target.value } }))}
                />
              </div>
            </div>

            {/* Videos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Videos</h3>
                <button type="button" className="text-primary-600" onClick={()=>setResources(r=>({ ...r, videos:[...r.videos, { title:'', embedId:'' }] }))}>+ Add Video</button>
              </div>
              {resources.videos.length === 0 && <p className="text-sm text-gray-500">No videos added.</p>}
              <div className="space-y-3">
                {resources.videos.map((v, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input className="px-3 py-2 border rounded-md" placeholder="Title"
                      value={v.title}
                      onChange={(e)=>setResources(r=>({ ...r, videos: updateArrayItem(r.videos, idx, { title: e.target.value }) }))}
                    />
                    <input className="px-3 py-2 border rounded-md" placeholder="YouTube Embed ID"
                      value={v.embedId}
                      onChange={(e)=>setResources(r=>({ ...r, videos: updateArrayItem(r.videos, idx, { embedId: e.target.value }) }))}
                    />
                    <button type="button" className="text-red-600" onClick={()=>setResources(r=>({ ...r, videos: removeArrayItem(r.videos, idx) }))}>Remove</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Documents</h3>
                <button type="button" className="text-primary-600" onClick={()=>setResources(r=>({ ...r, documents:[...r.documents, { title:'', link:'' }] }))}>+ Add Document</button>
              </div>
              {resources.documents.length === 0 && <p className="text-sm text-gray-500">No documents added.</p>}
              <div className="space-y-3">
                {resources.documents.map((d, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input className="px-3 py-2 border rounded-md" placeholder="Title"
                      value={d.title}
                      onChange={(e)=>setResources(r=>({ ...r, documents: updateArrayItem(r.documents, idx, { title: e.target.value }) }))}
                    />
                    <input className="px-3 py-2 border rounded-md" placeholder="Link"
                      value={d.link}
                      onChange={(e)=>setResources(r=>({ ...r, documents: updateArrayItem(r.documents, idx, { link: e.target.value }) }))}
                    />
                    <button type="button" className="text-red-600" onClick={()=>setResources(r=>({ ...r, documents: removeArrayItem(r.documents, idx) }))}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => router.push(`/brands/${brandId}/models/${modelId}`)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? (
                <>
                  <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Updating...
                </>
              ) : (
                'Update Variant'
              )}
            </button>
          </div>
        </form>

        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Variant</h3>
              <p className="text-gray-600 mb-6">Are you sure you want to delete this variant? This action cannot be undone.</p>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-4">
                  <p>{error}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Variant'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
