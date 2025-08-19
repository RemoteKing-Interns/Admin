'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiArrowLeft, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import Link from 'next/link';

type Model = {
  _id: string;
  name: string;
  imageUrl: string;
  description?: string;
  createdAt: string;
};

export default function BrandModelsPage() {
  const router = useRouter();
  const { id } = useParams();
  const [models, setModels] = useState<Model[]>([]);
  const [brand, setBrand] = useState<{ name: string; logoUrl: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBrandAndModels = async () => {
      try {
        setLoading(true);
        console.log('Fetching brand with ID:', id);
        
        // Fetch brand details
        const brandRes = await fetch(`/api/brands/${id}`);
        if (!brandRes.ok) {
          const errorText = await brandRes.text();
          console.error('Brand fetch error:', errorText);
          throw new Error('Failed to fetch brand');
        }
        const brandData = await brandRes.json();
        console.log('Brand data:', brandData);
        setBrand(brandData);
        
        // Fetch models for this brand
        console.log('Fetching models for brand ID:', id);
        const modelsRes = await fetch(`/api/brands/${id}/models`);
        if (!modelsRes.ok) {
          const errorText = await modelsRes.text();
          console.error('Models fetch error:', errorText);
          throw new Error('Failed to fetch models');
        }
        const modelsData = await modelsRes.json();
        console.log('Fetched models:', modelsData);
        setModels(modelsData);
        
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchBrandAndModels();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-100 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <FiArrowLeft className="mr-2" /> Back to Brands
          </button>
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md">
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4 sm:mb-0"
            >
              <FiArrowLeft className="mr-2" /> Back to Brands
            </button>
            {brand?.logoUrl && (
              <img
                src={brand.logoUrl}
                alt={brand.name}
                className="h-12 w-auto object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://via.placeholder.com/100x50?text=Logo';
                }}
              />
            )}
            <h1 className="text-2xl font-bold text-gray-900">{brand?.name} Models</h1>
          </div>
          <Link
            href={`/brands/${id}/models/new`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 mb-4 sm:mb-0"
          >
            <FiPlus className="mr-2 h-4 w-4" />
            Add Model
          </Link>
        </div>

        {models.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No models found</h3>
            <p className="text-gray-500 mb-6">Get started by adding a new model to this brand.</p>
            <Link
              href={`/brands/${id}/models/new`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <FiPlus className="mr-2 h-4 w-4" />
              Add Your First Model
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {models.map((model) => (
              <div key={model._id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-medium text-gray-900">{model.name}</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => router.push(`/brands/${id}/models/${model._id}/edit`)}
                        className="text-gray-400 hover:text-primary-600 focus:outline-none"
                        title="Edit model"
                      >
                        <FiEdit2 className="h-5 w-5" />
                      </button>
                      <button
                        // onClick={() => handleDeleteModel(model._id)}
                        className="text-gray-400 hover:text-red-600 focus:outline-none"
                        title="Delete model"
                      >
                        <FiTrash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-center">
                    <img
                      src={model.imageUrl}
                      alt={model.name}
                      className="h-32 w-auto object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://via.placeholder.com/200x100?text=Model+Image';
                      }}
                    />
                  </div>
                  {model.description && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {model.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
