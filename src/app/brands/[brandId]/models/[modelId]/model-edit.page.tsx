'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FiUpload, FiX, FiLoader, FiArrowLeft, FiTrash2 } from 'react-icons/fi';
import Link from 'next/link';

interface ModelData {
  _id: string;
  name: string;
  description?: string;
  imageUrl: string;
  brandId: string;
}

export default function EditModelPage() {
  const router = useRouter();
  const { brandId, modelId } = useParams<{ brandId: string; modelId: string }>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [brand, setBrand] = useState<{ name: string; logoUrl: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch model and brand data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        // Fetch model data
        const modelResponse = await fetch(`/api/brands/${brandId}/models/${modelId}`);
        if (!modelResponse.ok) throw new Error('Failed to fetch model');
        const modelData = await modelResponse.json();
        
        // Set form fields
        setName(modelData.name);
        setDescription(modelData.description || '');
        setCurrentImageUrl(modelData.imageUrl);
        
        // Fetch brand data
        const brandResponse = await fetch(`/api/brands/${brandId}`);
        if (!brandResponse.ok) throw new Error('Failed to fetch brand');
        const brandData = await brandResponse.json();
        setBrand(brandData);
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load model data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (brandId && modelId) {
      fetchData();
    }
  }, [brandId, modelId]);

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
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Clean up
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Model name is required');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      let imageUrl = currentImageUrl;
      
      // If a new file is uploaded, upload it to S3
      if (file) {
        // 1. Get presigned URL for S3 upload
        const presignedResponse = await fetch('/api/uploads/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            brandName: name.trim(),
            folder: 'models'
          }),
        });

        if (!presignedResponse.ok) {
          const errorData = await presignedResponse.text();
          console.error('Presign error:', errorData);
          throw new Error('Failed to get upload URL');
        }

        const { url, fields } = await presignedResponse.json();
        
        // 2. Upload the file to S3
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

        // 3. Get the public URL of the uploaded file
        const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME || 'remoteking';
        const region = process.env.NEXT_PUBLIC_S3_REGION || 'ap-southeast-2';
        imageUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fields.key}`;
      }

      // 4. Update the model in the database
      const modelResponse = await fetch(`/api/brands/${brandId}/models/${modelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim().toUpperCase(),
          imageUrl,
          description: description.trim(),
        }),
      });

      if (!modelResponse.ok) {
        const errorData = await modelResponse.json();
        console.error('Update model error:', errorData);
        
        if (modelResponse.status === 409) {
          throw new Error(errorData.details || 'A model with this name already exists');
        }
        
        throw new Error(errorData.error || 'Failed to update model');
      }

      // 5. Redirect to models list on success
      router.push(`/brands/${brandId}/models`);
      router.refresh();
    } catch (err) {
      console.error('Error updating model:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update model. Please try again.';
      setError(errorMessage);
      
      // Scroll to the error message
      if (errorRef.current) {
        errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Handle model deletion (triggered from modal confirm)
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError('');

      const response = await fetch(`/api/brands/${brandId}/models/${modelId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete model');
      }

      // Redirect to models list on success
      router.push(`/brands/${brandId}/models`);
      router.refresh();
    } catch (err) {
      console.error('Error deleting model:', err);
      setError('Failed to delete model. Please try again.');
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
            <button
              onClick={() => router.push(`/brands/${brandId}/models`)}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
            >
              <FiArrowLeft className="mr-2" /> Back to Models
            </button>
            <div>
              <h1 className="text-3xl font-bold text-secondary-900 mb-2">
                Edit Model
              </h1>
              {brand && (
                <p className="text-gray-600">
                  Update model details for <span className="font-medium">{brand.name}</span>
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            disabled={isUploading}
            className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <FiTrash2 className="mr-2 h-4 w-4" />
            Delete Model
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
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Model Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 uppercase"
              value={name}
              onChange={(e) => {
                const value = e.target.value;
                // Convert to uppercase as user types
                const upperValue = value.toUpperCase();
                setName(upperValue);
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

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="description"
              rows={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isUploading}
              maxLength={500}
            />
          </div>

          <div className="space-y-6">
            {currentImageUrl && !previewUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Image
                </label>
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
                  <p className="mt-2 text-sm text-gray-500">This is the current image being used</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {currentImageUrl ? 'Upload New Image' : 'Model Image'}
              </label>
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
                        <img
                          src={previewUrl || ''}
                          alt="New image preview"
                          className="h-32 w-auto object-contain"
                        />
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
                onClick={() => router.push(`/brands/${brandId}/models`)}
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
                  'Update Model'
                )}
              </button>
          </div>
        </form>

        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Model</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this model? This action cannot be undone.
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
                    'Delete Model'
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
