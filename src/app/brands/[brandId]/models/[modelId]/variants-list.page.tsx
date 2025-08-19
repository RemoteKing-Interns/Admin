'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiEdit2, FiX, FiSearch } from 'react-icons/fi';

interface BrandInfo { _id: string; name: string; logoUrl: string }
interface ModelInfo { _id: string; name: string; imageUrl?: string; description?: string }
interface VariantInfo {
  _id: string;
  name: string;
  images?: { car?: string };
  createdAt: string;
}

export default function VariantsListPage() {
  const { brandId, modelId } = useParams<{ brandId: string; modelId: string }>();

  const [brand, setBrand] = useState<BrandInfo | null>(null);
  const [model, setModel] = useState<ModelInfo | null>(null);
  const [variants, setVariants] = useState<VariantInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError('');

        const [brandRes, modelRes, variantsRes] = await Promise.all([
          fetch(`/api/brands/${brandId}`),
          fetch(`/api/brands/${brandId}/models/${modelId}`),
          fetch(`/api/brands/${brandId}/models/${modelId}/variants`),
        ]);

        if (!brandRes.ok) throw new Error('Failed to fetch brand');
        if (!modelRes.ok) throw new Error('Failed to fetch model');
        if (!variantsRes.ok) throw new Error('Failed to fetch variants');

        const [brandData, modelData, variantsData] = await Promise.all([
          brandRes.json(),
          modelRes.json(),
          variantsRes.json(),
        ]);
        setBrand(brandData);
        setModel(modelData);
        setVariants(variantsData);
      } catch (err) {
        console.error(err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    if (brandId && modelId) fetchAll();
  }, [brandId, modelId]);

  const filtered = variants.filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <Link 
              href={`/brands/${brandId}/models`}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
            >
              <FiArrowLeft className="mr-2" /> Back to Models
            </Link>
            <h1 className="text-3xl font-bold text-secondary-900">
              {model?.name || 'Model'} Variants
            </h1>
            <p className="text-gray-600">Viewing variants under {brand?.name || 'this brand'}</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Link
              href={`/brands/${brandId}/models/${modelId}/variants/new`}
              className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700"
            >
              + Add Variant
            </Link>
            <div className="relative flex-1 max-w-md w-full md:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search variants..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setSearchTerm('')}
                >
                  <FiX className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 1.1.9 2 2 2h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 5v4h8V5M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No variants found</h3>
            <p className="text-gray-500">This model has no variants yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((variant) => (
              <div
                key={variant._id}
                className="brand-card relative group block hover:shadow-lg transition-shadow duration-200 rounded-lg overflow-hidden bg-white"
              >
                <div className="absolute top-2 right-2 z-10 flex space-x-1">
                  <Link
                    href={`/brands/${brandId}/models/${modelId}/variants/${variant._id}/edit`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white"
                    title="View variant"
                  >
                    <FiEdit2 className="h-4 w-4 text-gray-600" />
                  </Link>
                </div>
                <div className="h-48 flex items-center justify-center bg-gray-50 p-4">
                  {variant.images?.car ? (
                    <img
                      src={variant.images.car as string}
                      alt={variant.name}
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://via.placeholder.com/200x100?text=Image+Not+Found';
                      }}
                    />
                  ) : (
                    <div className="text-gray-400">
                      <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 text-center whitespace-normal break-words">{variant.name}</h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
