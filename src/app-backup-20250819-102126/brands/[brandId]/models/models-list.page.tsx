'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiArrowLeft, FiPlus, FiEdit2, FiTrash2, FiSearch, FiX } from 'react-icons/fi';
import Link from 'next/link';

interface Model {
  _id: string;
  name: string;
  imageUrl: string;
  description?: string;
  createdAt: string;
}

export default function BrandModelsPage() {
  const router = useRouter();
  const { brandId } = useParams<{ brandId: string }>();
  const [models, setModels] = useState<Model[]>([]);
  const [brand, setBrand] = useState<{ name: string; logoUrl: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});

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

  // Handle model deletion
  const handleDelete = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this model? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(prev => ({ ...prev, [modelId]: true }));
      
      const response = await fetch(`/api/brands/${brandId}/models/${modelId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete model');
      }

      // Update the models list
      setModels(prev => prev.filter(model => model._id !== modelId));
    } catch (err) {
      console.error('Error deleting model:', err);
      alert('Failed to delete model. Please try again.');
    } finally {
      setIsDeleting(prev => ({ ...prev, [modelId]: false }));
    }
  };

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
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link 
            href="/brands"
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <FiArrowLeft className="mr-2" /> Back to Brands
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-secondary-900">
                {brand?.name || 'Brand'} Models
              </h1>
              <p className="text-gray-600 mt-1">
                Manage models for {brand?.name || 'this brand'}
              </p>
            </div>
            
            <Link
              href={`/brands/${brandId}/models/new`}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <FiPlus className="-ml-1 mr-2 h-4 w-4" />
              Add New Model
            </Link>
          </div>
          
          {/* Search Bar */}
          <div className="relative max-w-md mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="Search models..."
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

        {error ? (
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
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            {filteredModels.length === 0 ? (
              <div className="text-center p-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No models</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm
                    ? 'No models match your search.'
                    : 'Get started by creating a new model.'}
                </p>
                <div className="mt-6">
                  <Link
                    href={`/brands/${brandId}/models/new`}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <FiPlus className="-ml-1 mr-2 h-4 w-4" />
                    New Model
                  </Link>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredModels.map((model) => (
                  <li key={model._id} className="hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {model.imageUrl ? (
                            <img
                              className="h-12 w-12 rounded-md object-cover"
                              src={model.imageUrl}
                              alt={model.name}
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-md bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-500 text-xs">No Image</span>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-primary-600 truncate">
                              {model.name}
                            </p>
                            {model.description && (
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                {model.description}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              Added on {new Date(model.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0 flex space-x-2">
                          <Link
                            href={`/brands/${brandId}/models/edit/${model._id}`}
                            className="text-gray-400 hover:text-primary-500"
                            title="Edit Model"
                          >
                            <FiEdit2 className="h-5 w-5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(model._id)}
                            disabled={isDeleting[model._id]}
                            className="text-gray-400 hover:text-red-500 disabled:opacity-50"
                            title="Delete Model"
                          >
                            {isDeleting[model._id] ? (
                              <FiLoader className="h-5 w-5 animate-spin" />
                            ) : (
                              <FiTrash2 className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
