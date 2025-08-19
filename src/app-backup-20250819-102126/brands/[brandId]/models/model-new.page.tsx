'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FiUpload, FiX, FiLoader, FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';

interface BrandInfo {
  _id: string;
  name: string;
  logoUrl: string;
}

export default function NewModelPage() {
  const router = useRouter();
  const { brandId } = useParams<{ brandId: string }>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [brand, setBrand] = useState<BrandInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch brand info
  useEffect(() => {
    const fetchBrand = async () => {
      try {
        const response = await fetch(`/api/brands/${brandId}`);
        if (!response.ok) throw new Error('Failed to fetch brand');
        const data = await response.json();
        setBrand(data);
      } catch (err) {
        console.error('Error fetching brand:', err);
        setError('Failed to load brand information');
      } finally {
        setIsLoading(false);
      }
    };

    if (brandId) {
      fetchBrand();
    }
  }, [brandId]);

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
    
    if (!file) {
      setError('Please select an image');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
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
      const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fields.key}`;

      // 4. Create the model in the database
      const modelResponse = await fetch(`/api/brands/${brandId}/models`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim().toUpperCase(),
          imageUrl: fileUrl,
          description: description.trim(),
        }),
      });

      if (!modelResponse.ok) {
        const errorData = await modelResponse.json();
        console.error('Create model error:', errorData);
        
        if (modelResponse.status === 409) {
          throw new Error(errorData.details || 'This model already exists for this brand');
        }
        
        throw new Error(errorData.error || 'Failed to create model');
      }

      // 5. Redirect to models list on success
      router.push(`/brands/${brandId}/models`);
      router.refresh();
    } catch (err) {
      console.error('Error creating model:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create model. Please try again.';
      setError(errorMessage);
      
      // Scroll to the error message
      if (errorRef.current) {
        errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } finally {
      setIsUploading(false);
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
        <div className="mb-8">
          <Link 
            href={`/brands/${brandId}/models`}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <FiArrowLeft className="mr-2" /> Back to Models
          </Link>
          <h1 className="text-3xl font-bold text-secondary-900 mb-2">
            Add New Model
          </h1>
          {brand && (
            <p className="text-gray-600">
              Add a new model for <span className="font-medium">{brand.name}</span>
            </p>
          )}
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Model Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={name}
              onChange={(e) => {
                const value = e.target.value;
                // Convert to uppercase as user types
                const upperValue = value.toUpperCase();
                setName(upperValue);
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model Image <span className="text-red-500">*</span>
            </label>
            <div 
              className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
                error && !file ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-primary-500'
              }`}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  const selectedFile = e.dataTransfer.files[0];
                  setFile(selectedFile);
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="space-y-1 text-center">
                {previewUrl ? (
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Preview"
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
                      Click or drag to change the image
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
              disabled={isUploading || !name.trim() || !file}
            >
              {isUploading ? (
                <>
                  <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Creating...
                </>
              ) : (
                'Create Model'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
