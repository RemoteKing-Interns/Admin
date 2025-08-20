'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FiArrowLeft, FiUpload, FiX } from 'react-icons/fi';

interface BrandInfo { _id: string; name: string }
interface ModelInfo { _id: string; name: string }

export default function NewVariantPage() {
  const router = useRouter();
  const params = useParams();
  const brandId = (params as any)?.brandId as string;
  const modelId = (params as any)?.modelId as string;

  // basic
  const [name, setName] = useState('');
  const [rkid, setRkid] = useState('');

  // image
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('https://remoteking.s3.ap-southeast-2.amazonaws.com/variants/');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // structured fields
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

  type KeyBladeProfile = { name: string; refNo: string; link: string };
  const [keyBladeProfiles, setKeyBladeProfiles] = useState<KeyBladeProfile[]>([]);

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

  const [pathways, setPathways] = useState<{ name: string; path: string }[]>([]);
  const [resources, setResources] = useState({
    quickReference: { emergencyStart: '', obdPortLocation: '' },
    videos: [] as { title: string; embedId: string }[],
    documents: [] as { title: string; link: string }[],
  });

  // refs
  const [brand, setBrand] = useState<BrandInfo | null>(null);
  const [model, setModel] = useState<ModelInfo | null>(null);

  // ui
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [b, m] = await Promise.all([
          fetch(`/api/brands/${brandId}`),
          fetch(`/api/brands/${brandId}/models/${modelId}`),
        ]);
        if (b.ok) setBrand(await b.json());
        if (m.ok) setModel(await m.json());
      } finally {
        setLoading(false);
      }
    };
    if (brandId && modelId) load();
  }, [brandId, modelId]);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // helpers
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const okTypes = ['image/jpeg','image/png','image/gif','image/webp'];
    if (!okTypes.includes(f.type)) { setError('Use JPEG/PNG/GIF/WebP'); return; }
    if (f.size > 5 * 1024 * 1024) { setError('Max size 5MB'); return; }
    setError('');
    setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }

    setSaving(true);
    try {
      let finalUrl = imageUrl?.trim() || '';

      // upload if a file is provided
      if (file) {
        const presign = await fetch('/api/uploads/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, contentType: file.type, folder: 'variants' }),
        });
        if (!presign.ok) throw new Error('Failed to get upload URL');
        const { url, fields } = await presign.json();

        const form = new FormData();
        Object.entries(fields).forEach(([k, v]) => form.append(k, v as string));
        form.append('file', file);
        const up = await fetch(url, { method: 'POST', body: form });
        if (!up.ok) throw new Error('Failed to upload image');

        const bucket = process.env.NEXT_PUBLIC_S3_BUCKET_NAME || 'remoteking';
        const region = process.env.NEXT_PUBLIC_S3_REGION || 'ap-southeast-2';
        finalUrl = `https://${bucket}.s3.${region}.amazonaws.com/${fields.key}`;
      }

      // Build Programming Info ensuring missing fields are 'Not Applicable'
      const ensureDefaults = (opt: ProgOption) => {
        const name = (opt.name && opt.name.trim()) ? opt.name.trim() : 'Not Applicable';
        const Color = (opt.Color && opt.Color.trim()) ? opt.Color.trim() : 'Not Applicable';
        const models = (opt.models && opt.models.length > 0) ? opt.models : ['Not Applicable'];
        return { name, Color, models };
      };
      const cleanProgrammingInfo: any = Object.fromEntries(
        Object.entries(programmingInfo).map(([k, list]) => {
          const arr = (list as ProgOption[]);
          if (!arr || arr.length === 0) {
            return [k, [ensureDefaults({ name: '', Color: '', models: [] })]];
          }
          return [k, arr.map(ensureDefaults)];
        })
      );

      const payload: any = {
        name: name.trim(),
        rkid: rkid.trim() || undefined,
        imageUrl: finalUrl || undefined,
        images: finalUrl ? { car: finalUrl } : undefined,
        vehicleInfo,
        keyBladeProfiles: keyBladeProfiles.reduce((acc, p) => {
          if (!p.name) return acc;
          acc[p.name] = { refNo: p.refNo || undefined, link: p.link || undefined };
          return acc;
        }, {} as Record<string, { refNo?: string; link?: string }>),
        programmingInfo: cleanProgrammingInfo,
        pathways,
        resources,
      };

      // Debug payload being sent
      try {
        // Avoid logging large files
        const { images: _img, ...rest } = payload;
        console.log('Submitting Variant payload:', JSON.stringify(rest));
      } catch {}

      const res = await fetch(`/api/brands/${brandId}/models/${modelId}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to create variant');
      }

      router.push(`/brands/${brandId}/models/${modelId}`);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to create variant');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/brands/${brandId}/models/${modelId}`} className="flex items-center text-gray-600 hover:text-gray-900">
            <FiArrowLeft className="mr-2" /> Back to Variants
          </Link>
          {brand && model && (
            <div className="text-sm text-gray-600">{brand.name} / {model.name}</div>
          )}
        </div>

        <h1 className="text-3xl font-bold text-secondary-900 mb-4">Add Variant</h1>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
              <input
                className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={saving}
              />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">RK ID</label>
              <input
                className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={rkid}
                onChange={(e) => setRkid(e.target.value)}
                disabled={saving}
              />
              </div>
            </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Variant Image (images.car)</label>
            <div className="flex items-center gap-4">
              <div
                className={`flex-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${file ? 'border-primary-300' : 'border-gray-300 hover:border-primary-500'}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-center">
                  {file ? (
                    <div className="flex flex-col items-center">
                      {preview && <img src={preview} alt="preview" className="h-32 w-auto object-contain" />}
                      <button
                        type="button"
                        className="mt-2 inline-flex items-center text-red-600"
                        onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); if (fileInputRef.current) fileInputRef.current.value=''; }}
                      >
                        <FiX className="mr-1" /> Remove
                      </button>
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                      <p>Upload image (PNG/JPG/GIF/WebP up to 5MB)</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="w-full md:w-1/3">
                <label className="block text-xs text-gray-500 mb-1">Or paste image URL</label>
                <input
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500"
                  placeholder="https://remoteking.s3.ap-southeast-2.amazonaws.com/variants/"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" onChange={handleFileChange} disabled={saving} />
          </div>

          {/* Vehicle Info */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Vehicle Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ['make','Make'],['model','Model'],['series','Series'],['yearRange','Year Range'],['keyType','Key Type'],['remoteFrequency','Remote Frequency'],['Lishi','Lishi Tool'],['LishiLink','Lishi Link']
              ].map(([key,label]) => (
                <div key={key as string}>
                  <label className="block text-sm text-gray-700 mb-1">{label}</label>
                  <input
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500"
                    value={(vehicleInfo as any)[key] || ''}
                    onChange={(e)=>setVehicleInfo(v=>({ ...v, [key as string]: e.target.value }))}
                    disabled={saving}
                  />
                </div>
              ))}
            </div>
            {/* Array fields for Vehicle Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {([
                ['transponderChip','Transponder Chips'],
                ['transponderChipLinks','Transponder Chip Links'],
                ['KingParts','King Parts'],
                ['KingPartsLinks','King Parts Links'],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">{label}</label>
                    <button type="button" className="text-primary-600" onClick={()=>setVehicleInfo(v=>({ ...v, [key]: [...(v as any)[key], ''] }))}>+ Add</button>
                  </div>
                  <div className="space-y-2">
                    {(vehicleInfo as any)[key].map((val: string, idx: number) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500"
                          value={val}
                          onChange={(e)=>setVehicleInfo(v=>{ const next = [...(v as any)[key]]; next[idx]=e.target.value; return { ...v, [key]: next }; })}
                        />
                        <button type="button" className="text-red-600" onClick={()=>setVehicleInfo(v=>{ const next = [...(v as any)[key]]; next.splice(idx,1); return { ...v, [key]: next }; })}>Remove</button>
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
            {([
              ['remoteOptions','Remote Options'],
              ['keyBladeOptions','Key Blade Options'],
              ['cloningOptions','Cloning Options'],
              ['allKeysLost','All Keys Lost'],
              ['addSpareKey','Add Spare Key'],
              ['addRemote','Add Remote'],
              ['pinRequired','PIN Required'],
              ['pinReading','PIN Reading'],
              ['remoteProgramming','Remote Programming'],
            ] as const).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">{label}</label>
                  <button type="button" className="text-primary-600" onClick={()=>setProgrammingInfo(pi=>({ ...pi, [key]: [...(pi as any)[key], { name:'', Color:'', models:[] }] }))}>+ Add</button>
                </div>
                {((programmingInfo as any)[key] as ProgOption[]).length === 0 && (
                  <p className="text-sm text-gray-500">No items added.</p>
                )}
                {((programmingInfo as any)[key] as ProgOption[]).map((opt: ProgOption, idx: number) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-8 gap-3">
                    <input
                      className="px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 md:col-span-2 min-w-0"
                      placeholder="Name"
                      value={opt.name}
                      onChange={(e)=>setProgrammingInfo(pi=>{ const next = updateArrayItem((pi as any)[key] as ProgOption[], idx, { name:e.target.value }); return { ...pi, [key]: next }; })}
                    />
                    <div className="flex items-center gap-2 md:col-span-2 min-w-0 overflow-hidden">
                      <input
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500"
                        placeholder="Color name or hex (#00FF00)"
                        value={opt.Color}
                        onChange={(e)=>setProgrammingInfo(pi=>{ const next = updateArrayItem((pi as any)[key] as ProgOption[], idx, { Color:e.target.value }); return { ...pi, [key]: next }; })}
                      />
                      <input
                        type="color"
                        className="h-10 w-10 p-0 border border-gray-300 rounded-md shrink-0"
                        value={getColorPickerValue(opt.Color)}
                        onChange={(e)=>setProgrammingInfo(pi=>{ const next = updateArrayItem((pi as any)[key] as ProgOption[], idx, { Color:e.target.value }); return { ...pi, [key]: next }; })}
                      />
                    </div>
                    <input
                      className="px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 md:col-span-3 min-w-0"
                      placeholder="Models (comma separated)"
                      value={opt.modelsInput ?? opt.models.join(', ')}
                      onChange={(e)=>{
                        const raw = e.target.value;
                        const parts = raw.split(',').map(s=>s.trim()).filter(Boolean);
                        setProgrammingInfo(pi=>{ const next = updateArrayItem((pi as any)[key] as ProgOption[], idx, { models: parts, modelsInput: raw }); return { ...pi, [key]: next }; });
                      }}
                      onBlur={(e)=>{
                        // normalize display to joined form after editing
                        const raw = e.target.value;
                        const parts = raw.split(',').map(s=>s.trim()).filter(Boolean);
                        setProgrammingInfo(pi=>{ const next = updateArrayItem((pi as any)[key] as ProgOption[], idx, { models: parts, modelsInput: parts.join(', ') }); return { ...pi, [key]: next }; });
                      }}
                    />
                    <button
                      type="button"
                      className="text-red-600"
                      onClick={()=>setProgrammingInfo(pi=>{ const next = removeArrayItem((pi as any)[key] as ProgOption[], idx); return { ...pi, [key]: next }; })}
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
              <button type="button" className="text-primary-600" onClick={()=>setPathways(p=>[...p,{ name:'', path:'' }])}>+ Add Pathway</button>
            </div>
            {pathways.length === 0 && <p className="text-sm text-gray-500">No pathways added.</p>}
            {pathways.map((p, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <input className="px-3 py-2 border rounded-md" placeholder="Name" value={p.name}
                  onChange={(e)=>setPathways(updateArrayItem(pathways, idx, { name:e.target.value }))} />
                <input className="px-3 py-2 border rounded-md md:col-span-3" placeholder="Path (e.g., IMMOBILIZER>...)" value={p.path}
                  onChange={(e)=>setPathways(updateArrayItem(pathways, idx, { path:e.target.value }))} />
                <button type="button" className="text-red-600" onClick={()=>setPathways(removeArrayItem(pathways, idx))}>Remove</button>
              </div>
            ))}
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Emergency Start</label>
                <input className="w-full px-3 py-2 border rounded-md" value={resources.quickReference.emergencyStart}
                  onChange={(e)=>setResources(r=>({ ...r, quickReference: { ...r.quickReference, emergencyStart: e.target.value } }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">OBD Port Location</label>
                <input className="w-full px-3 py-2 border rounded-md" value={resources.quickReference.obdPortLocation}
                  onChange={(e)=>setResources(r=>({ ...r, quickReference: { ...r.quickReference, obdPortLocation: e.target.value } }))} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Videos</label>
                <button type="button" className="text-primary-600" onClick={()=>setResources(r=>({ ...r, videos: [...r.videos, { title:'', embedId:'' }] }))}>+ Add Video</button>
              </div>
              {resources.videos.length === 0 && <p className="text-sm text-gray-500">No videos added.</p>}
              {resources.videos.map((v, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2">
                  <input className="px-3 py-2 border rounded-md md:col-span-2" placeholder="Title" value={v.title}
                    onChange={(e)=>setResources(r=>{ const next = updateArrayItem(r.videos, idx, { title:e.target.value }); return { ...r, videos: next }; })} />
                  <input className="px-3 py-2 border rounded-md md:col-span-2" placeholder="YouTube ID" value={v.embedId}
                    onChange={(e)=>setResources(r=>{ const next = updateArrayItem(r.videos, idx, { embedId:e.target.value }); return { ...r, videos: next }; })} />
                  <button type="button" className="text-red-600" onClick={()=>setResources(r=>({ ...r, videos: removeArrayItem(r.videos, idx) }))}>Remove</button>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Documents</label>
                <button type="button" className="text-primary-600" onClick={()=>setResources(r=>({ ...r, documents: [...r.documents, { title:'', link:'' }] }))}>+ Add Document</button>
              </div>
              {resources.documents.length === 0 && <p className="text-sm text-gray-500">No documents added.</p>}
              {resources.documents.map((d, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2">
                  <input className="px-3 py-2 border rounded-md md:col-span-2" placeholder="Title" value={d.title}
                    onChange={(e)=>setResources(r=>{ const next = updateArrayItem(r.documents, idx, { title:e.target.value }); return { ...r, documents: next }; })} />
                  <input className="px-3 py-2 border rounded-md md:col-span-2" placeholder="Link" value={d.link}
                    onChange={(e)=>setResources(r=>{ const next = updateArrayItem(r.documents, idx, { link:e.target.value }); return { ...r, documents: next }; })} />
                  <button type="button" className="text-red-600" onClick={()=>setResources(r=>({ ...r, documents: removeArrayItem(r.documents, idx) }))}>Remove</button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link href={`/brands/${brandId}/models/${modelId}`} className="px-4 py-2 rounded-md border">Cancel</Link>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Create Variant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
