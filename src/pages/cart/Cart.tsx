import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Trash2, Minus, Plus, CreditCard, ShoppingBag, Loader, Truck, X, MessageCircle, Info, AlertCircle } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useCurrencyStore } from '../../store/currencyStore';
import { FlutterwavePayment } from '../../components/FlutterwavePayment';
import { OrderReceipt } from '../../components/OrderReceipt';
import { supabase } from '../../lib/supabase';

const DELIVERY_FEE = 4000; // ₦4,000
const FREE_DELIVERY_THRESHOLD = 50000; // ₦50,000

export function Cart() {
  const { items, removeFromCart, updateQuantity, loading, fetchCart, clearCart } = useCartStore();
  const user = useAuthStore((state) => state.user);
  const { formatPrice, convertPrice, currency } = useCurrencyStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentOption, setPaymentOption] = useState<'full' | 'partial'>('full');
  const [error, setError] = useState<string | null>(null);
  
  const canCheckout = items.length >= 2; // Minimum 2 items required for checkout
  
  // Delivery details state
  const [deliveryDetails, setDeliveryDetails] = useState({
    name: '',
    phone: '',
    address: '',
    state: ''
  });

  useEffect(() => {
    if (user) {
      fetchCart();
    }
  }, [user, fetchCart]);

  useEffect(() => {
    // Check if we're returning from a redirect payment
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment_success');
    
    if (paymentSuccess === 'true') {
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Clear the cart
      clearCart().catch(err => console.error('Error clearing cart:', err));
      
      // Show success message and redirect to dashboard
      showNotification('Payment successful! Your order has been placed.', 'success');
      navigate('/dashboard');
    }
  }, [navigate, clearCart]);

  // Listen for currency changes
  useEffect(() => {
    const handleCurrencyChange = () => {
      // Force re-render by updating a state
      setCheckoutLoading(false);
    };

    window.addEventListener('currencyChange', handleCurrencyChange);
    return () => window.removeEventListener('currencyChange', handleCurrencyChange);
  }, []);

  const subtotal = items.reduce((sum, item) => {
    if (item.product) {
      return sum + item.product.price * item.quantity;
    }
    return sum;
  }, 0);

  // Calculate delivery fee - free if subtotal is above threshold
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  
  // Calculate totals based on payment option
  const getPaymentAmount = () => {
    if (paymentOption === 'partial') {
      return subtotal; // Pay only for products, delivery fee on arrival
    }
    return subtotal + deliveryFee; // Pay full amount including delivery
  };

  const total = subtotal + deliveryFee;
  const paymentAmount = getPaymentAmount();

  // Convert prices for display
  const convertedSubtotal = convertPrice(subtotal);
  const convertedDeliveryFee = convertPrice(deliveryFee);
  const convertedTotal = convertPrice(total);
  const convertedFreeThreshold = convertPrice(FREE_DELIVERY_THRESHOLD);

  const handleQuantityChange = async (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    try {
      await updateQuantity(productId, newQuantity);
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    try {
      await removeFromCart(productId);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const createOrder = async () => {
    try {
      setError(null);
      
      // Validate required fields
      if (!deliveryDetails.name || !deliveryDetails.phone || !deliveryDetails.address || !deliveryDetails.state) {
        throw new Error('Please fill in all delivery details');
      }

      if (items.length === 0) {
        throw new Error('Cart is empty');
      }

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      console.log('Creating order with details:', {
        user_id: user.id,
        total: total,
        delivery_fee: deliveryFee,
        payment_option: paymentOption,
        items_count: items.length
      });

      // Prepare cart items for order creation
      const cartItems = items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.product.price,
        variant_id: item.variant_id || null,
        selected_color: item.selected_color || null,
        selected_size: item.selected_size || null
      }));

      // Use the improved order creation function
      const { data: newOrderId, error: orderError } = await supabase.rpc('create_order_with_items', {
        p_user_id: user.id,
        p_total: total,
        p_delivery_fee: deliveryFee,
        p_delivery_fee_paid: paymentOption === 'full',
        p_payment_option: paymentOption,
        p_delivery_name: deliveryDetails.name,
        p_delivery_phone: deliveryDetails.phone,
        p_delivery_address: `${deliveryDetails.address}, ${deliveryDetails.state}`,
        p_payment_method: 'flutterwave',
        p_cart_items: JSON.stringify(cartItems)
      });

      if (orderError) {
        console.error('Order creation error:', orderError);
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      if (!newOrderId) {
        throw new Error('Order creation failed - no order ID returned');
      }

      console.log('Order created successfully:', newOrderId);
      return newOrderId;
    } catch (error) {
      console.error('Error creating order:', error);
      setError(error instanceof Error ? error.message : 'Failed to create order');
      throw error;
    }
  };

  const handleFlutterwaveInit = async () => {
    try {
      setCheckoutLoading(true);
      setError(null);
      
      const newOrderId = await createOrder();
      setOrderId(newOrderId);
      return newOrderId;
    } catch (error) {
      console.error('Error initializing payment:', error);
      setCheckoutLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Error creating order. Please try again.';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
      return null;
    }
  };

  const handleFlutterwaveSuccess = async (response: any) => {
    try {
      setError(null);
      console.log('Processing successful payment:', response);
      
      if (!orderId) {
        throw new Error('No order ID found');
      }

      // Update order with payment details
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          payment_ref: response.transaction_id || response.tx_ref || response.flw_ref,
          status: 'completed'
        })
        .eq('id', orderId)
        .select(`
          *,
          items:order_items (
            id,
            product:products (
              name,
              image
            ),
            quantity,
            price
          )
        `)
        .single();

      if (updateError) {
        console.error('Error updating order:', updateError);
        throw updateError;
      }

      console.log('Order updated successfully:', updatedOrder);

      // Set current order for receipt
      setCurrentOrder(updatedOrder);
      setShowReceipt(true);

      // Generate WhatsApp message
      const whatsappMessage = generateWhatsAppMessage(updatedOrder, items);
      
      // Open WhatsApp with pre-filled message
      window.open(`https://wa.me/2347060438205?text=${encodeURIComponent(whatsappMessage)}`, '_blank');

      // Clear the cart after successful payment
      await clearCart();
      
      // Show success notification
      showNotification('Order placed successfully! You can now download your receipt.', 'success');
    } catch (error) {
      console.error('Error processing order after payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
      setError(errorMessage);
      showNotification('Payment was successful, but there was an error processing your order. Please contact support.', 'error');
    } finally {
      setCheckoutLoading(false);
      setOrderId(null);
    }
  };

  const handleFlutterwaveClose = () => {
    setCheckoutLoading(false);
    
    // If payment was cancelled, delete the pending order
    if (orderId) {
      supabase
        .from('orders')
        .delete()
        .eq('id', orderId)
        .then(() => {
          setOrderId(null);
          console.log('Pending order deleted');
        }, (error: any) => {
          console.error('Error deleting pending order:', error);
        });
    }
  };

  const generateWhatsAppMessage = (order: any, items: any[]) => {
    const formattedTotal = formatPrice(order.total);
    const formattedPaymentAmount = formatPrice(paymentAmount);
    const formattedDeliveryFee = formatPrice(deliveryFee);

    let message = `🛍️ *New Order #${order.id.substring(0, 8)}*\n\n`;
    message += `*Customer Details:*\n`;
    message += `Name: ${order.delivery_name}\n`;
    message += `Phone: ${order.delivery_phone}\n`;
    message += `Address: ${order.delivery_address}\n\n`;
    
    message += `*Order Items:*\n`;
    items.forEach(item => {
      const subtotal = formatPrice(item.quantity * item.product.price);
      
      message += `• ${item.product.name} (×${item.quantity}) - ${subtotal}\n`;
    });
    
    message += `\n*Payment Details:*\n`;
    message += `Subtotal: ${formatPrice(subtotal)}\n`;
    
    if (deliveryFee > 0) {
      message += `Delivery Fee: ${formattedDeliveryFee}`;
      if (paymentOption === 'partial') {
        message += ` (To be paid on arrival)\n`;
      } else {
        message += ` (Paid online)\n`;
      }
    } else {
      message += `Delivery Fee: FREE\n`;
    }
    
    message += `*Total Order Value:* ${formattedTotal}\n`;
    message += `*Amount Paid Online:* ${formattedPaymentAmount}\n`;
    
    if (paymentOption === 'partial' && deliveryFee > 0) {
      message += `*Amount to Collect on Delivery:* ${formattedDeliveryFee}\n`;
    }
    
    message += `*Payment Method:* ${order.payment_method}\n`;
    message += `*Payment Reference:* ${order.payment_ref}\n\n`;
    message += `Please process my order. Thank you!`;

    return message;
  };

  const handleChatWithSales = () => {
    const message = "Hello! I'm interested in making a purchase from Ulisha Store. Can you help me?";
    window.open(`https://wa.me/2347060438205?text=${encodeURIComponent(message)}`, '_blank');
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary-orange" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-4">Add some items to your cart to get started</p>
          <button
            onClick={() => navigate('/')}
            className="text-primary-orange hover:text-primary-orange/90 font-medium"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Cart items */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Shopping Cart</h2>
                  <button
                    onClick={handleChatWithSales}
                    className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>Chat with Sales</span>
                  </button>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                      <p className="text-red-800 text-sm">{error}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {items.map((item) => {
                    if (!item.product) return null;
                    
                    return (
                        <div
                        key={item.id}
                        className="flex flex-col sm:flex-row justify-between border-b pb-4"
                        >
                        <div className="flex items-center space-x-4">
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-20 h-20 object-cover rounded-md"
                          />
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">{item.product.name}</h3>
                            <p className="text-sm text-gray-500">{item.product.category}</p>
                            {/* Display selected variant details */}
                            {(item.selected_color || item.selected_size) && (
                              <div className="text-sm text-gray-600 mt-1">
                                {item.selected_color && (
                                  <span className="mr-2">Color: {item.selected_color}</span>
                                )}
                                {item.selected_size && (
                                  <span>Size: {item.selected_size}</span>
                                )}
                              </div>
                            )}
                            <p className="text-lg font-bold text-gray-900 mt-1">
                              {formatPrice(item.product.price)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 self-center sm:self-auto mt-4 sm:mt-0">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleQuantityChange(item.product_id, item.quantity - 1)}
                              className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
                              disabled={loading || item.quantity <= 1}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => handleQuantityChange(item.product_id, item.quantity + 1)}
                              className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
                              disabled={loading}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.product_id)}
                            className="text-red-500 hover:text-red-600 disabled:opacity-50"
                            disabled={loading}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Order summary and delivery details */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span>Subtotal ({items.length} items)</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                {/* Delivery Information */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <Truck className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">Delivery Fee</span>
                    </div>
                    <span className="text-sm">
                      {deliveryFee === 0 ? (
                        <span className="text-green-600 font-medium">FREE</span>
                      ) : (
                        formatPrice(deliveryFee)
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {subtotal >= FREE_DELIVERY_THRESHOLD ? (
                      "You've qualified for free delivery!"
                    ) : (
                      `Add ${formatPrice(FREE_DELIVERY_THRESHOLD - subtotal)} more to get free delivery`
                    )}
                  </p>
                </div>

                {/* Payment Options */}
                {deliveryFee > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <Info className="w-4 h-4 mr-2 text-blue-500" />
                      Payment Options
                    </h3>
                    <div className="space-y-3">
                      <label className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="paymentOption"
                          value="full"
                          checked={paymentOption === 'full'}
                          onChange={(e) => setPaymentOption(e.target.value as 'full' | 'partial')}
                          className="h-4 w-4 text-primary-orange focus:ring-primary-orange border-gray-300 mt-0.5"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">
                            Pay Full Amount Online
                          </span>
                          <div className="text-sm text-gray-600">
                            {formatPrice(total)} - Everything paid upfront
                          </div>
                        </div>
                      </label>
                      
                      <label className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="paymentOption"
                          value="partial"
                          checked={paymentOption === 'partial'}
                          onChange={(e) => setPaymentOption(e.target.value as 'full' | 'partial')}
                          className="h-4 w-4 text-primary-orange focus:ring-primary-orange border-gray-300 mt-0.5"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">
                            Pay Products Only
                          </span>
                          <div className="text-sm text-gray-600">
                            {formatPrice(subtotal)} now + {formatPrice(deliveryFee)} on delivery
                          </div>
                        </div>
                      </label>
                    </div>
                    
                    {paymentOption === 'partial' && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="flex items-start">
                          <Info className="w-4 h-4 text-yellow-600 mt-0.5 mr-2" />
                          <p className="text-xs text-yellow-800">
                            <strong>Note:</strong> You'll pay {formatPrice(deliveryFee)} to the delivery person upon arrival.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-700 bg-blue-50 p-3 rounded-md">
                  <div className="flex items-start">
                    <Truck className="w-4 h-4 text-blue-600 mt-0.5 mr-2" />
                    <div>
                      <p className="font-medium text-blue-900 mb-1">Delivery Information</p>
                      <p>Delivery takes 1-14 days after payment confirmation. We'll call you to confirm delivery details before shipping.</p>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Amount to Pay Now</span>
                    <span className="text-primary-orange">{formatPrice(paymentAmount)}</span>
                  </div>
                  {paymentOption === 'partial' && deliveryFee > 0 && (
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>Pay on delivery</span>
                      <span>{formatPrice(deliveryFee)}</span>
                    </div>
                  )}
                </div>
                {currency === 'USD' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Converted from NGN at rate: 1 USD = ₦1,630
                  </p>
                )}
              </div>
              
              {/* Contact Information */}
              <div>
                <h3 className="text-md font-semibold text-gray-900 mb-3">Delivery Information</h3>
                <div className="space-y-3 mb-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange"
                      value={deliveryDetails.name}
                      onChange={(e) => setDeliveryDetails({...deliveryDetails, name: e.target.value})}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange"
                      value={deliveryDetails.phone}
                      onChange={(e) => setDeliveryDetails({...deliveryDetails, phone: e.target.value})}
                      placeholder="Enter your phone number"
                    />
                  </div>
                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      id="state"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange"
                      value={deliveryDetails.state}
                      onChange={(e) => setDeliveryDetails({...deliveryDetails, state: e.target.value})}
                      placeholder="Enter your state"
                    />
                  </div>
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Address *
                    </label>
                    <textarea
                      id="address"
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange"
                      value={deliveryDetails.address}
                      onChange={(e) => setDeliveryDetails({...deliveryDetails, address: e.target.value})}
                      placeholder="Enter your full delivery address"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col space-y-4">
                  <FlutterwavePayment
                    amount={paymentAmount} // Pass the calculated payment amount in NGN
                    onSuccess={handleFlutterwaveSuccess}
                    onClose={handleFlutterwaveClose}
                    customerInfo={{
                      name: deliveryDetails.name,
                      email: user?.email || '',
                      phone: deliveryDetails.phone
                    }}
                    disabled={
                      !deliveryDetails.name || 
                      !deliveryDetails.phone || 
                      !deliveryDetails.address ||
                      !deliveryDetails.state ||
                      checkoutLoading ||
                      !canCheckout ||
                      paymentAmount <= 0
                    }
                    orderId={orderId ?? undefined}
                    onInit={handleFlutterwaveInit}
                    className="w-full bg-primary-orange text-white py-3 rounded-lg hover:bg-primary-orange/90 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CreditCard className="w-5 h-5" />
                    <span>
                      {checkoutLoading 
                        ? 'Processing...' 
                        : `Pay ${formatPrice(paymentAmount)} with Flutterwave`
                      }
                    </span>
                  </FlutterwavePayment>

                  <button
                    onClick={() => {
                      // Crypto payment logic will go here
                      showNotification('Crypto payment coming soon!', 'error');
                    }}
                    disabled={
                      !deliveryDetails.name || 
                      !deliveryDetails.phone || 
                      !deliveryDetails.address ||
                      !deliveryDetails.state ||
                      checkoutLoading ||
                      !canCheckout
                    }
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg 
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727" />
                    </svg>
                    <span>Pay with Crypto (Coming Soon)</span>
                  </button>

                  {!canCheckout && items.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600 text-center flex items-center justify-center">
                        <Info className="w-4 h-4 mr-2" />
                        Minimum 2 items required to checkout
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Receipt Modal */}
      {showReceipt && currentOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Order Receipt</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowReceipt(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <OrderReceipt order={currentOrder} transactionRef={currentOrder.payment_ref} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}