import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronDown, Facebook, Twitter, Instagram, Youtube, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';


function Footer() {
    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        fetchCategories();
    }, []);

    async function fetchCategories() {
        const { data, error } = await supabase
            .from('products')
            .select('category')
            .order('created_at', { ascending: false });

        if (data) {
            const uniqueCategories = Array.from(
                new Set(
                    data
                        .map((product: { category?: string }) => product.category)
                        .filter((cat): cat is string => !!cat && cat.trim() !== '')
                )
            );
            setCategories(uniqueCategories);
        }
        if (error) {
            if (error.code === 'PGRST301' || error.message?.includes('Failed to fetch')) {
                return;
            }
            if (error.code === 'JWT_INVALID') {
                console.error('Authentication error:', error);
                return;
            }
            throw error;
        }
    }

    return (
        <footer className="bg-gray-900 text-white mt-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
               

            {/* About UlishaStore Section */}
            <div>
            {/* Categories Section */}
            <div>
            <h3 className="text-lg font-semibold mb-4">Categories</h3>
            {categories.length > 0 ? (
                <ul className="flex flex-wrap text-gray-400 gap-x-2 gap-y-1">
                {categories.map((category) => (
                <li key={category}>
                <Link
                    to={`/${category}`}
                    className="hover:text-primary-orange transition-colors whitespace-nowrap"
                >
                    {category}
                </Link>
                </li>
                ))}
                </ul>
            ) : (
                <p className="text-gray-500 text-sm">No categories found.</p>
            )}
            </div>
            <br />
            <h3 className="text-lg font-semibold mb-4">About UlishaStore</h3>
            <p className="text-gray-400 text-sm">
                Your one-stop shop for fashion, accessories, shoes, and smart devices. We bring you the
                best quality products at competitive prices.
            </p>
            </div>

            {/* Quick Links */}
            <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-gray-400">
                <li>
                <Link to="/" className="hover:text-primary-orange transition-colors">
                Home
                </Link>
                </li>
                <li>
                <Link to="/about" className="hover:text-primary-orange transition-colors">
                About Us
                </Link>
                </li>
                <li>
                <Link to="/terms" className="hover:text-primary-orange transition-colors">
                Terms & Conditions
                </Link>
                </li>
                <li>
                <Link to="/returns" className="hover:text-primary-orange transition-colors">
                Return Policy
                </Link>
                </li>
            </ul>
            </div>

            {/* Payment Methods */}
            <div>
            <h3 className="text-lg font-semibold mb-4">Payment Methods</h3>
            <div className="flex flex-wrap items-center gap-3">
                <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" alt="Visa" className="h-8 w-auto bg-white rounded p-1" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-8 w-auto bg-white rounded p-1" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-8 w-auto bg-white rounded p-1" />
            </div>
            <p className="text-gray-400 text-xs mt-2">We accept all major international payment methods.</p>
            </div>

            {/* Contact & Social */}
            <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-2 text-gray-400">
                <li className="flex items-center space-x-2">
                <span>ulishastore@gmail.com</span>
                </li>
            </ul>
            <h3 className="text-lg font-semibold mt-6 mb-4">Follow Us</h3>
            <div className="flex space-x-4">
                <a
                href="https://www.facebook.com/share/1AhYhxox4X/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary-orange transition-colors"
                >
                <Facebook className="w-6 h-6" />
                </a>
                <a
                href="https://x.com/ulishastores"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary-orange transition-colors"
                >
                <Twitter className="w-6 h-6" />
                </a>
                <a
                href="https://www.instagram.com/ulisha_store?"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary-orange transition-colors"
                >
                <Instagram className="w-6 h-6" />
                </a>
                <a
                href="https://www.tiktok.com/@ulishastores"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary-orange transition-colors"
                >
                <Youtube className="w-6 h-6" />
                </a>
            </div>
            </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} UlishaStore. All rights reserved.</p>
            </div>
            </div>
        </footer>
    );
}

export default Footer;