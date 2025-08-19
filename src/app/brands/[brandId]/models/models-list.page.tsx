'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FiArrowLeft, FiPlus, FiEdit2, FiSearch, FiX } from 'react-icons/fi';
import Link from 'next/link';

interface Model {
  _id: string;
  name: string;
  imageUrl: string;
  description?: string;
  createdAt: string;
}

export default function BrandModelsPage() {
  const { brandId } = useParams<{ brandId: string }>();
  const [models, setModels] = useState<Model[]>([]);
  const [brand, setBrand] = useState<{ name: string; logoUrl: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  

  // Fetch models and brand info
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        // Fetch brand info
        const brandResponse = await fetch(`/api/brands/${brandId}`);
        if (!brandResponse.ok) throw new Error('Failed to fetch brand');
        const brandData = await brandResponse.json();
        setBrand(brandData);
        
        // Fetch models
        const modelsResponse = await fetch(`/api/brands/${brandId}/models`);
        if (!modelsResponse.ok) throw new Error('Failed to fetch models');
        const modelsData = await modelsResponse.json();
        setModels(modelsData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (brandId) {
      fetchData();
    }
  }, [brandId]);

  // No inline delete on cards to match brand card UI

  // Filter models based on search term
  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (model.description && model.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
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
              href="/brands"
              className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
            >
              <FiArrowLeft className="mr-2" /> Back to Brands
            </Link>
            <h1 className="text-3xl font-bold text-secondary-900">
              {brand?.name || 'Brand'} Models
            </h1>
            <p className="text-gray-600">Manage models for {brand?.name || 'this brand'}</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search models..."
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
            
            <Link 
              href={`/brands/${brandId}/models/new`} 
              className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <FiPlus className="h-5 w-5" />
              Add Model
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {filteredModels.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 1.1.9 2 2 2h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 5v4h8V5M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              {searchTerm ? 'No matching models found' : 'No models found'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm 
                ? 'Try adjusting your search or filter' 
                : 'Get started by adding a new model'}
            </p>
            <Link 
              href={`/brands/${brandId}/models/new`} 
              className="btn-primary inline-flex items-center gap-2"
            >
              <FiPlus className="h-4 w-4" />
              Add Model
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredModels.map((model) => (
              <Link 
                key={model._id}
                href={`/brands/${brandId}/models/${model._id}`}
                className="brand-card relative group block hover:shadow-lg transition-shadow duration-200 rounded-lg overflow-hidden bg-white"
              >
                <div className="absolute top-2 right-2 z-10 flex space-x-1">
                  <Link
                    href={`/brands/${brandId}/models/${model._id}/edit`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white"
                    title="Edit model"
                  >
                    <FiEdit2 className="h-4 w-4 text-gray-600" />
                  </Link>
                </div>
                <div className="h-40 flex items-center justify-center bg-gray-50 p-4">
                  {model.imageUrl ? (
                    <img
                      src={model.imageUrl}
                      alt={model.name}
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
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{model.name}</h3>
                  {model.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{model.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    Added on {new Date(model.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
