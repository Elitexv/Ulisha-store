import React, { useRef, useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface AdCarouselProps {
  className?: string;
}

interface Advertisement {
  id: string;
  title: string;
  description: string;
  image_url: string;
  button_text: string;
  button_link: string;
  active: boolean;
}

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export function AdCarousel({ className = '' }: AdCarouselProps) {
  const prevRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const checkNetworkConnectivity = () => {
    return navigator.onLine;
  };

  const fetchAds = async (retryCount = 0): Promise<void> => {
    try {
      // Check network connectivity first
      if (!checkNetworkConnectivity()) {
        throw new Error('No internet connection');
      }

      setIsLoading(true);
      setError(null);

      // Optionally, you can check if supabase is defined or handle errors from the client itself
      if (!supabase) {
        throw new Error('Supabase client is not configured');
      }

      const { data, error: supabaseError } = await supabase
        .from('advertisements')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (supabaseError) {
        // Log the specific Supabase error for debugging
        console.error('Supabase error:', supabaseError);
        throw supabaseError;
      }
      
      setAds(data || []);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching ads:', error);
      
      if (retryCount < MAX_RETRIES) {
        // Exponential backoff
        const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        await delay(retryDelay);
        return fetchAds(retryCount + 1);
      }

      // Provide more specific error messages
      let errorMessage = 'Unable to load advertisements. ';
      if (!checkNetworkConnectivity()) {
        errorMessage += 'Please check your internet connection.';
      } else if (!supabase) {
        errorMessage += 'Supabase configuration is missing.';
      } else if (error instanceof Error) {
        errorMessage += `Error: ${error.message}`;
      } else {
        errorMessage += 'An unexpected error occurred.';
      }

      setError(errorMessage);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();

    // Subscribe to changes
    const subscription = supabase
      .channel('advertisements')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'advertisements' }, 
        () => fetchAds()
      )
      .subscribe();

    // Add online/offline event listeners
    const handleOnline = () => {
      if (error) {
        fetchAds(); // Retry when connection is restored
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', () => {
      setError('No internet connection. Please check your network.');
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', () => {});
    };
  }, []);

  if (isLoading) {
    return (
      <div className={`h-[200px] sm:h-[250px] flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="animate-pulse text-gray-500">Loading advertisements...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`h-[200px] sm:h-[250px] flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-gray-500">{error}</div>
      </div>
    );
  }

  if (ads.length === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        spaceBetween={0}
        slidesPerView={1}
        navigation={{
          prevEl: prevRef.current,
          nextEl: nextRef.current,
        }}
        pagination={{ clickable: true }}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
        }}
        loop={true}
        className="h-[200px] sm:h-[350px]"
        onInit={(swiper) => {
          // @ts-ignore
          swiper.params.navigation.prevEl = prevRef.current;
          // @ts-ignore
          swiper.params.navigation.nextEl = nextRef.current;
          swiper.navigation.init();
          swiper.navigation.update();
        }}
      >
        {ads.map((ad) => (
          <SwiperSlide key={ad.id}>
            <div 
              className="relative w-full h-full bg-cover bg-center flex items-center"
              style={{ backgroundImage: `url(${ad.image_url})` }}
            >
              <div className="absolute inset-0 bg-black bg-opacity-40"></div>
              <div className="relative z-10 text-white text-center w-full px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3">{ad.title}</h2>
                <p className="text-sm sm:text-base mb-3 sm:mb-4">{ad.description}</p>
                <a 
                  href={ad.button_link}
                  className="inline-block bg-primary-orange hover:bg-primary-orange/90 text-white font-medium py-2 px-6 rounded-full transition-colors text-sm sm:text-base"
                >
                  {ad.button_text}
                </a>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      
      {/* Custom navigation buttons */}
      <div 
        ref={prevRef}
        className="absolute top-1/2 left-4 z-10 -translate-y-1/2 bg-white bg-opacity-10 hover:bg-opacity-50 rounded-full p-2 cursor-pointer transition-all"
      >
        <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
      </div>
      <div 
        ref={nextRef}
        className="absolute top-1/2 right-4 z-10 -translate-y-1/2 bg-white bg-opacity-10 hover:bg-opacity-50 rounded-full p-2 cursor-pointer transition-all"
      >
        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
      </div>
    </div>
  );
}