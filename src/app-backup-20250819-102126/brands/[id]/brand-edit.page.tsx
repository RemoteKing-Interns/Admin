'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FiUpload, FiX, FiLoader, FiArrowLeft, FiTrash2 } from 'react-icons/fi';

export default function EditBrandPage() {
  const router = useRouter();
  const { id } = useParams();
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Fetch brand data
  useEffect(() => {
    const fetchBrand = async () => {
      try {
        const response = await fetch(`/api/brands/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch brand');
        }
        const brand = await response.json();
        setName(brand.name);
        setCurrentLogoUrl(brand.logoUrl);
      } catch (err) {
        console.error('Error fetching brand:', err);
        setError('Failed to load brand data');
      }
    };

    if (id) {
      fetchBrand();
    }
  }, [id]);

  // Handle file selection and preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
        return;
      }
      
      // Validate file size (5MB max)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      
      setFile(selectedFile);
      setError('');
    }
  };

  // Generate preview URL when file changes
  useEffect(() => {
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Clean up
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Brand name is required');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      let logoUrl = currentLogoUrl;
      
      // If a new file is uploaded, upload it first
      if (file) {
        // Get presigned URL for S3 upload
        const presignedResponse = await fetch('/api/uploads/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            brandName: name.trim(),
          }),
        });

        if (!presignedResponse.ok) {
          const errorData = await presignedResponse.text();
          console.error('Presign error:', errorData);
          throw new Error('Failed to get upload URL');
        }

        const { url, fields } = await presignedResponse.json();
        
        // Upload the file to S3
        const formData = new FormData();
        Object.entries(fields).forEach(([key, value]) => {
          formData.append(key, value as string);
        });
        formData.append('file', file);

        const uploadResponse = await fetch(url, {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.text();
          console.error('Upload error:', errorData);
          throw new Error('Failed to upload file');
        }

        // Construct the S3 URL using the bucket name and region from environment variables
        const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME || 'remoteking';
        const region = process.env.NEXT_PUBLIC_S3_REGION || 'ap-southeast-2';
        logoUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fields.key}`;
      }

      // Update the brand in the database
      const brandResponse = await fetch(`/api/brands/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          logoUrl,
        }),
      });

      if (!brandResponse.ok) {
        const errorData = await brandResponse.json();
        console.error('Update brand error:', errorData);
        
        if (brandResponse.status === 409) {
          throw new Error(errorData.details || 'This brand already exists');
        }
        
        throw new Error(errorData.error || 'Failed to update brand');
      }

      // Redirect to brands list on success
      router.push('/brands');
      router.refresh();
    } catch (err) {
      console.error('Error updating brand:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update brand. Please try again.';
      setError(errorMessage);
      
      // Scroll to the error message
      if (errorRef.current) {
        errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      setIsUploading(false);
    }
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
        return;
      }
      
      // Validate file size (5MB max)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      
      setFile(selectedFile);
      setError('');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Handle brand deletion
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError('');

      const response = await fetch(`/api/brands/${id}/delete`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete brand');
      }

      // Redirect to brands list on success
      router.push('/brands');
      router.refresh();
    } catch (err) {
      console.error('Error deleting brand:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete brand');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="flex-1 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
            >
              <FiArrowLeft className="mr-2" /> Back to Brands
            </button>
            <h1 className="text-3xl font-bold text-secondary-900">Edit Brand</h1>
            <p className="text-gray-600">Update the brand details and logo</p>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            disabled={isUploading}
          >
            <FiTrash2 className="mr-2 h-4 w-4" />
            Delete Brand
          </button>
        </div>

        {error && (
          <div 
            ref={errorRef}
            className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6" 
            role="alert"
          >
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label htmlFor="brand-name" className="block text-sm font-medium text-gray-700 mb-2">
              Brand Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="brand-name"
              className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 uppercase"
              placeholder="Enter brand name"
              value={name}
              onChange={(e) => {
                const upperValue = e.target.value.toUpperCase();
                setName(upperValue);
                if (error) setError('');
              }}
              onBlur={(e) => {
                const upperValue = e.target.value.toUpperCase();
                if (upperValue !== e.target.value) {
                  setName(upperValue);
                }
              }}
              disabled={isUploading}
              maxLength={100}
              autoComplete="off"
              required
            />
          </div>

          <div className="space-y-6">
            {/* Current Logo Section */}
            {currentLogoUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Logo
                </label>
                <div className="mt-1 flex flex-col items-center p-4 border border-gray-200 rounded-md bg-gray-50">
                  <div className="relative">
                    <img
                      src={currentLogoUrl}
                      alt="Current logo"
                      className="h-32 w-auto object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://via.placeholder.com/200x100?text=Logo+Not+Found';
                      }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    This is the current logo being used
                  </p>
                </div>
              </div>
            )}

            {/* Upload New Logo Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {currentLogoUrl ? 'Upload New Logo' : 'Logo'}
              </label>
              <div 
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
                  error && !file ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-primary-500'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="space-y-1 text-center">
                  {file ? (
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <img
                          src={previewUrl || ''}
                          alt="New logo preview"
                          className="h-32 w-auto object-contain"
                        />
                        <button
                          type="button"
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                        >
                          <FiX className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        Click or drag to change the logo
                      </p>
                    </div>
                  ) : (
                    <>
                      <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600 justify-center">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none"
                        >
                          <span>Upload a file</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            disabled={isUploading}
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

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => router.push('/brands')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              disabled={isUploading || !name.trim()}
            >
              {isUploading ? (
                <>
                  <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Updating...
                </>
              ) : (
                'Update Brand'
              )}
            </button>
          </div>
        </form>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Brand</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this brand? This action cannot be undone.
              </p>
              
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
                    'Delete Brand'
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
