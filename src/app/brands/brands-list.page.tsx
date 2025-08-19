'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiPlus, FiSearch, FiEdit2 } from 'react-icons/fi';

type Brand = {
  _id: string;
  name: string;
  logoUrl: string;
  createdAt: string;
};

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/brands');
        if (!response.ok) {
          throw new Error('Failed to fetch brands');
        }
        const data = await response.json();
        setBrands(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load brands');
      } finally {
        setLoading(false);
      }
    };

    fetchBrands();
  }, []);

  const filteredBrands = brands
    .filter(brand => 
      brand.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
        <p className="font-bold">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-secondary-900">Brands</h1>
            <p className="text-gray-600">Manage your brand catalog</p>
          </div>
            
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search brands..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Link 
              href="/brands/new" 
              className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <FiPlus className="h-5 w-5" />
              Add Brand
            </Link>
          </div>
        </div>

        {filteredBrands.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 1.1.9 2 2 2h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 5v4h8V5M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No brands found</h3>
            <p className="text-gray-500 mb-4">Get started by adding a new brand</p>
            <Link href="/brands/new" className="btn-primary inline-flex items-center gap-2">
              <FiPlus className="h-4 w-4" />
              Add Brand
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBrands.map((brand) => (
              <Link 
                href={`/brands/${brand._id}`}
                className="brand-card relative group block hover:shadow-lg transition-shadow duration-200 rounded-lg overflow-hidden bg-white"
              >
                <div className="absolute top-2 right-2 z-10 flex space-x-1">
                  <Link 
                    href={`/brands/${brand._id}/edit`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white"
                    title="Edit brand"
                  >
                    <FiEdit2 className="h-4 w-4 text-gray-600" />
                  </Link>
                </div>
                <div className="logo-container mb-4">
                  <img
                    src={brand.logoUrl}
                    alt={brand.name}
                    className="logo-image"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://via.placeholder.com/200x100?text=Logo+Not+Found';
                    }}
                  />
                </div>
                <div className="p-4 pt-0">
                  <h3 className="text-lg font-semibold text-gray-900 text-center">{brand.name}</h3>
                  <p className="text-sm text-gray-500 text-center mt-1">Click to view models</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
