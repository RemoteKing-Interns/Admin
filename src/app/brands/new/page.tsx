'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiUpload, FiX, FiLoader } from 'react-icons/fi';

export default function NewBrandPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

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
      setError('Brand name is required');
      return;
    }
    
    if (!file) {
      setError('Please select a logo');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      // First, get presigned URL for S3 upload with brand name for file naming
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

      // Get the public URL of the uploaded file
      const fileUrl = `${url}${fields.key}`;

      // Create the brand in the database
      const brandResponse = await fetch('/api/brands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          logoUrl: fileUrl,
        }),
      });

      if (!brandResponse.ok) {
        const errorData = await brandResponse.json();
        console.error('Create brand error:', errorData);
        
        // Handle duplicate brand error
        if (brandResponse.status === 409) {
          throw new Error(errorData.details || 'This brand already exists');
        }
        
        throw new Error(errorData.error || 'Failed to create brand');
      }

      // Redirect to brands list on success
      router.push('/brands');
      router.refresh();
    } catch (err) {
      console.error('Error creating brand:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create brand. Please try again.';
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

  return (
    <div className="flex-1 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-900 mb-2">Add New Brand</h1>
          <p className="text-gray-600">Upload a logo and enter the brand details</p>
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
                // Convert input to uppercase
                const upperValue = e.target.value.toUpperCase();
                setName(upperValue);
                if (error) setError('');
              }}
              onBlur={(e) => {
                // Ensure the value is in uppercase when leaving the field
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo <span className="text-red-500">*</span>
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
                {previewUrl ? (
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Logo preview"
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

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
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
                  Uploading...
                </>
              ) : (
                'Add Brand'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
