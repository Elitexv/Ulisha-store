import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { Loader, Upload, Trash2, Edit, AlertTriangle, Check, X, Package, Plus, Image, Users, Eye, TrendingUp, DollarSign, ShoppingCart, Calendar } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Product } from '../../../types';

const ADMIN_EMAILS = ['paulelite606@gmail.com', 'obajeufedo2@gmail.com'];

interface AnalyticsData {
  totalUsers: number;
  todayVisitors: number;
  todayPageViews: number;
  todayNewUsers: number;
  todayOrders: number;
  todayRevenue: number;
  weeklyStats: Array<{
    date: string;
    unique_visitors: number;
    page_views: number;
    new_users: number;
    orders_count: number;
    revenue: number;
  }>;
}

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showAdForm, setShowAdForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  
  const productImageRef = useRef<HTMLInputElement>(null);
  const additionalImagesRef = useRef<HTMLInputElement>(null);
  const adImageRef = useRef<HTMLInputElement>(null);
  
  const [productData, setProductData] = useState({
    name: '',
    price: '',
    category: 'Clothes',
    description: '',
    image: null as File | null,
    additionalImages: [] as File[],
    original_price: '',
    discount_price: '',
    discount_active: false,
    shipping_location: 'Nigeria'
  });

  const [adData, setAdData] = useState({
    title: '',
    description: '',
    image: null as File | null,
    button_text: '',
    button_link: '',
    active: true
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!ADMIN_EMAILS.includes(user.email || '')) {
      navigate('/');
      return;
    }
    
    fetchProducts();
    fetchAnalytics();
  }, [user, navigate]);

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);

      // Get today's stats
      const today = new Date().toISOString().split('T')[0];
      const { data: todayStats } = await supabase
        .from('analytics_daily_stats')
        .select('*')
        .eq('date', today)
        .single();

      // Get last 7 days stats
      const { data: weeklyStats } = await supabase
        .from('analytics_daily_stats')
        .select('*')
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: true });

      // Update daily stats
      await supabase.rpc('update_daily_stats');

      setAnalytics({
        totalUsers: 0, // Will be updated when we have proper RPC function
        todayVisitors: todayStats?.unique_visitors || 0,
        todayPageViews: todayStats?.page_views || 0,
        todayNewUsers: todayStats?.new_users || 0,
        todayOrders: todayStats?.orders_count || 0,
        todayRevenue: todayStats?.revenue || 0,
        weeklyStats: weeklyStats || []
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productData.image && !editingProduct) {
      alert('Please select a product image');
      return;
    }
    
    try {
      setFormLoading(true);

      const productToSave = {
        name: productData.name,
        category: productData.category,
        description: productData.description,
        original_price: parseFloat(productData.original_price),
        discount_price: productData.discount_active ? parseFloat(productData.discount_price) : null,
        discount_active: productData.discount_active,
        shipping_location: productData.shipping_location
      };

      if (editingProduct) {
        const updates: any = { ...productToSave };
        
        if (productData.image) {
          const imageName = `${uuidv4()}-${productData.image.name}`;
          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(imageName, productData.image);
          
          if (uploadError) throw uploadError;
          
          const { data: { publicUrl: imageUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(imageName);
          
          updates.image = imageUrl;
        }

        const { error: updateError } = await supabase
          .from('products')
          .update(updates)
          .eq('id', editingProduct.id);

        if (updateError) throw updateError;

        if (productData.additionalImages.length > 0) {
          const additionalImagePromises = productData.additionalImages.map(async (file) => {
            const fileName = `${uuidv4()}-${file.name}`;
            const { error: additionalUploadError } = await supabase.storage
              .from('product-images')
              .upload(fileName, file);
            
            if (additionalUploadError) throw additionalUploadError;
            
            const { data: { publicUrl: additionalImageUrl } } = supabase.storage
              .from('product-images')
              .getPublicUrl(fileName);
            
            return { product_id: editingProduct.id, image_url: additionalImageUrl };
          });
          
          const additionalImageData = await Promise.all(additionalImagePromises);
          
          const { error: additionalImagesError } = await supabase
            .from('product_images')
            .insert(additionalImageData);
          
          if (additionalImagesError) throw additionalImagesError;
        }
      } else {
        if (!productData.image) {
          throw new Error('Product image is required');
        }

        const imageName = `${uuidv4()}-${productData.image.name}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(imageName, productData.image);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl: imageUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(imageName);

        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert([{
            ...productToSave,
            image: imageUrl
          }])
          .select()
          .single();

        if (insertError) throw insertError;

        if (productData.additionalImages.length > 0) {
          const additionalImagePromises = productData.additionalImages.map(async (file) => {
            const fileName = `${uuidv4()}-${file.name}`;
            const { error: additionalUploadError } = await supabase.storage
              .from('product-images')
              .upload(fileName, file);
            
            if (additionalUploadError) throw additionalUploadError;
            
            const { data: { publicUrl: additionalImageUrl } } = supabase.storage
              .from('product-images')
              .getPublicUrl(fileName);
            
            return { product_id: newProduct.id, image_url: additionalImageUrl };
          });
          
          const additionalImageData = await Promise.all(additionalImagePromises);
          
          const { error: additionalImagesError } = await supabase
            .from('product_images')
            .insert(additionalImageData);
          
          if (additionalImagesError) throw additionalImagesError;
        }
      }

      setProductData({
        name: '',
        price: '',
        category: 'Clothes',
        description: '',
        image: null,
        additionalImages: [],
        original_price: '',
        discount_price: '',
        discount_active: false,
        shipping_location: 'Nigeria'
      });
      
      if (productImageRef.current) productImageRef.current.value = '';
      if (additionalImagesRef.current) additionalImagesRef.current.value = '';
      
      setShowProductForm(false);
      setEditingProduct(null);
      fetchProducts();
      
      showNotification(
        editingProduct ? 'Product updated successfully!' : 'Product added successfully!',
        'success'
      );
      
    } catch (error) {
      console.error('Error saving product:', error);
      showNotification('Error saving product. Please try again.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleAdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adData.image) {
      alert('Please select an advertisement image');
      return;
    }
    
    try {
      setFormLoading(true);

      const imageName = `${uuidv4()}-${adData.image.name}`;
      const { error: uploadError } = await supabase.storage
        .from('advertisements')
        .upload(imageName, adData.image);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl: imageUrl } } = supabase.storage
        .from('advertisements')
        .getPublicUrl(imageName);

      const { error: insertError } = await supabase
        .from('advertisements')
        .insert([{
          title: adData.title,
          description: adData.description,
          image_url: imageUrl,
          button_text: adData.button_text,
          button_link: adData.button_link,
          active: adData.active
        }]);

      if (insertError) throw insertError;

      setAdData({
        title: '',
        description: '',
        image: null,
        button_text: '',
        button_link: '',
        active: true
      });
      
      if (adImageRef.current) adImageRef.current.value = '';
      
      setShowAdForm(false);
      showNotification('Advertisement added successfully!', 'success');
      
    } catch (error) {
      console.error('Error saving advertisement:', error);
      showNotification('Error saving advertisement. Please try again.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      setDeleteLoading(true);
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
      
      if (error) throw error;
      
      fetchProducts();
      setDeleteConfirmation(null);
      showNotification('Product deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting product:', error);
      showNotification('Error deleting product. Please try again.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleProductImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setProductData({ ...productData, image: e.target.files[0] });
    }
  };

  const handleAdImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAdData({ ...adData, image: e.target.files[0] });
    }
  };

  const handleAdditionalImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setProductData({ 
        ...productData, 
        additionalImages: [...productData.additionalImages, ...newFiles] 
      });
    }
  };

  const removeAdditionalImage = (index: number) => {
    const updatedImages = [...productData.additionalImages];
    updatedImages.splice(index, 1);
    setProductData({ ...productData, additionalImages: updatedImages });
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('animate-fade-out');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-primary-orange" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => setShowAdForm(!showAdForm)}
              className="bg-blue-600 text-white px-2 py-1 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Place advert</span>
            </button>
            <button
              onClick={() => setShowProductForm(!showProductForm)}
              className="bg-primary-orange text-white px-2 py-1 rounded-md hover:bg-primary-orange/90 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Analytics Overview</h2>
          
          {analyticsLoading ? (
            <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-center">
              <Loader className="w-6 h-6 animate-spin text-primary-orange mr-2" />
              <span>Loading analytics...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">-</p>
                      <p className="text-xs text-gray-500">Coming soon</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Eye className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Today's Visitors</p>
                      <p className="text-2xl font-bold text-gray-900">{analytics?.todayVisitors || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Page Views Today</p>
                      <p className="text-2xl font-bold text-gray-900">{analytics?.todayPageViews || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <ShoppingCart className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Orders Today</p>
                      <p className="text-2xl font-bold text-gray-900">{analytics?.todayOrders || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Users className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">New Users Today</p>
                      <p className="text-2xl font-bold text-gray-900">{analytics?.todayNewUsers || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Revenue Today</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {new Intl.NumberFormat('en-NG', {
                          style: 'currency',
                          currency: 'NGN'
                        }).format(analytics?.todayRevenue || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Weekly Stats Table */}
              {analytics?.weeklyStats && analytics.weeklyStats.length > 0 && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      Last 7 Days Performance
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visitors</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page Views</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New Users</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {analytics.weeklyStats.map((stat, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {new Date(stat.date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat.unique_visitors}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat.page_views}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat.new_users}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat.orders_count}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Intl.NumberFormat('en-NG', {
                                  style: 'currency',
                                  currency: 'NGN'
                                }).format(stat.revenue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Advertisement Form */}
        {showAdForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add New Advertisement</h2>
              <button
                onClick={() => setShowAdForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAdSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  required
                  value={adData.title}
                  onChange={(e) => setAdData({ ...adData, title: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-orange focus:ring-primary-orange"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows={3}
                  required
                  value={adData.description}
                  onChange={(e) => setAdData({ ...adData, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-orange focus:ring-primary-orange"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Image</label>
                <input
                  type="file"
                  ref={adImageRef}
                  accept="image/*"
                  required
                  onChange={handleAdImageSelect}
                  className="mt-1 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary-orange file:text-white
                    hover:file:bg-primary-orange/90"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Button Text</label>
                <input
                  type="text"
                  required
                  value={adData.button_text}
                  onChange={(e) => setAdData({ ...adData, button_text: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-orange focus:ring-primary-orange"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Button Link</label>
                <input
                  type="text"
                  required
                  value={adData.button_link}
                  onChange={(e) => setAdData({ ...adData, button_link: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-orange focus:ring-primary-orange"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={adData.active}
                  onChange={(e) => setAdData({ ...adData, active: e.target.checked })}
                  className="h-4 w-4 text-primary-orange focus:ring-primary-orange border-gray-300 rounded"
                />
                <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
                  Active
                </label>
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowAdForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-primary-orange text-white px-4 py-2 rounded-md hover:bg-primary-orange/90 transition-colors flex items-center space-x-2"
                >
                  {formLoading ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      <span>Add Advertisement</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Product Form */}
        {showProductForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => {
                  setShowProductForm(false);
                  setEditingProduct(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleProductSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product Name</label>
                  <input
                    type="text"
                    required
                    value={productData.name}
                    onChange={(e) => setProductData({ ...productData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-orange focus:ring-primary-orange"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Original Price (NGN)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={productData.original_price}
                    onChange={(e) => setProductData({ ...productData, original_price: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-orange focus:ring-primary-orange"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      id="discount_active"
                      checked={productData.discount_active}
                      onChange={(e) => setProductData({ ...productData, discount_active: e.target.checked })}
                      className="h-4 w-4 text-primary-orange focus:ring-primary-orange border-gray-300 rounded"
                    />
                    <label htmlFor="discount_active" className="text-sm font-medium text-gray-700">
                      Apply Discount
                    </label>
                  </div>

                  {productData.discount_active && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Discount Price (NGN)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={productData.discount_price}
                        onChange={(e) => setProductData({ ...productData, discount_price: e.target.value })}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-orange focus:ring-primary-orange"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    required
                    value={productData.category}
                    onChange={(e) => setProductData({ ...productData, category: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-orange focus:ring-primary-orange"
                  >
                    <option value="Clothes">Clothes</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Shoes">Shoes</option>
                    <option value="Smart Watches">Smart Watches</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Perfumes & Body Spray">Perfumes & Body Spray</option>
                    <option value="Phones">Phones</option>
                    <option value="Handbags">Handbags</option>
                    <option value="Jewelries">Jewelries</option>
                    <option value="Gym Wear">Gym Wear</option>
                    
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Shipping Location</label>
                <select
                  required
                  value={productData.shipping_location}
                  onChange={(e) => setProductData({ ...productData, shipping_location: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-orange focus:ring-primary-orange"
                >
                  <option value="Nigeria">Nigeria</option>
                  <option value="Abroad">Abroad</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows={4}
                  required
                  value={productData.description}
                  onChange={(e) => setProductData({ ...productData, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-orange focus:ring-primary-orange"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Main Product Image</label>
                  <input
                    type="file"
                    ref={productImageRef}
                    accept="image/*"
                    onChange={handleProductImageSelect}
                    className="mt-1 block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-primary-orange file:text-white
                      file:hover:bg-primary-orange/90"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Additional Images</label>
                  <input
                    type="file"
                    ref={additionalImagesRef}
                    accept="image/*"
                    multiple
                    onChange={handleAdditionalImagesSelect}
                    className="mt-1 block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-primary-orange file:text-white
                      file:hover:bg-primary-orange/90"
                  />
                </div>
              </div>
              
              {/* Preview of additional images */}
              {productData.additionalImages.length > 0 && (
                <div className="grid grid-cols-6 gap-2">
                  {productData.additionalImages.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Additional image ${index + 1}`}
                        className="h-20 w-20 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => removeAdditionalImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowProductForm(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-primary-orange text-white px-4 py-2 rounded-md hover:bg-primary-orange/90 transition-colors flex items-center space-x-2"
                >
                  {formLoading ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      <span>{editingProduct ? 'Updating...' : 'Adding...'}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      <span>{editingProduct ? 'Update Product' : 'Add Product'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Products List */}
        {products.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Products ({products.length})</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <img className="h-10 w-10 rounded-full object-cover" src={product.image} alt="" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Intl.NumberFormat('en-NG', {
                              style: 'currency',
                              currency: 'NGN'
                            }).format(product.price)}
                          </div>
                          {product.discount_active && product.original_price && (
                            <div className="text-xs text-gray-500">
                              <span className="line-through">
                                {new Intl.NumberFormat('en-NG', {
                                  style: 'currency',
                                  currency: 'NGN'
                                }).format(product.original_price)}
                              </span>
                              <span className="ml-1 text-green-600">-{product.discount_percentage}%</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {product.shipping_location}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => {
                                setEditingProduct(product);
                                setProductData({
                                  name: product.name,
                                  price: product.price.toString(),
                                  category: product.category,
                                  description: product.description,
                                  image: null,
                                  additionalImages: [],
                                  original_price: product.original_price?.toString() || product.price.toString(),
                                  discount_price: product.discount_price?.toString() || '',
                                  discount_active: product.discount_active || false,
                                  shipping_location: product.shipping_location
                                });
                                setShowProductForm(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmation(product.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          {deleteConfirmation === product.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                              <div className="px-4 py-2 text-sm text-gray-700">Delete this product?</div>
                              <div className="border-t border-gray-100"></div>
                              <div className="flex justify-end px-4 py-2 space-x-2">
                                <button
                                  onClick={() => handleDeleteProduct(product.id)}
                                  disabled={deleteLoading}
                                  className="text-red-600 hover:text-red-900 text-sm font-medium"
                                >
                                  {deleteLoading ? (
                                    <Loader className="h-4 w-4 animate-spin" />
                                  ) : (
                                    'Delete'
                                  )}
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmation(null)}
                                  className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No products yet</h2>
            <p className="text-gray-600 mb-6">Add your first product to get started</p>
            <button
              onClick={() => setShowProductForm(true)}
              className="bg-primary-orange text-white px-6 py-3 rounded-md hover:bg-primary-orange/90 transition-colors flex items-center mx-auto"
            >
              <Plus className="h-5 w-5 mr-2" />
              <span>Add Product</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}