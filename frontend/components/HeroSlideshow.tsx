'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { api } from '@/lib/api';

interface HeroSlide {
    id: string;
    title: string;
    subtitle: string;
    imageUrl: string;
    linkUrl?: string;
    buttonText: string;
    order: number;
}

const fallbackSlides: HeroSlide[] = [
    {
        id: '1',
        title: 'Authentic Traditional Delicacies',
        subtitle: 'Delivered Fresh to Your Doorstep',
        imageUrl: '/images/hero-1.jpg',
        buttonText: 'Shop Now',
        linkUrl: '/catalog',
        order: 0,
    },
    {
        id: '2',
        title: 'Premium Quality Ingredients',
        subtitle: 'Sourced from Trusted Vendors',
        imageUrl: '/images/hero-2.jpg',
        buttonText: 'Explore Products',
        linkUrl: '/catalog',
        order: 1,
    },
    {
        id: '3',
        title: 'Fast & Reliable Delivery',
        subtitle: 'Order Today, Enjoy Tomorrow',
        imageUrl: '/images/hero-3.jpg',
        buttonText: 'Get Started',
        linkUrl: '/catalog',
        order: 2,
    }
];

export function HeroSlideshow() {
    const [slides, setSlides] = useState<HeroSlide[]>(fallbackSlides);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchSlides() {
            try {
                const data = await api.get('/api/admin/hero-slides/public');
                if (data && data.length > 0) {
                    setSlides(data);
                }
            } catch (error) {
                console.warn('Using fallback hero slides:', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchSlides();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [slides.length]);

    const goToSlide = (index: number) => {
        setCurrentSlide(index);
    };

    const goToPrevious = () => {
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    };

    const goToNext = () => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
    };

    if (isLoading) {
        return (
            <div className="relative w-full h-100 md:h-125 lg:h-150 bg-muted animate-pulse">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-muted-foreground">Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-100 md:h-125 lg:h-150 overflow-hidden bg-muted">
            {/* Slides */}
            <div className="relative w-full h-full">
                {slides.map((slide, index) => (
                    <div
                        key={slide.id}
                        className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'
                            }`}
                    >
                        <Image
                            src={slide.imageUrl}
                            alt={slide.title}
                            fill
                            className="object-cover"
                            priority={index === 0}
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="text-center text-white px-4 max-w-4xl">
                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 animate-fade-in">
                                    {slide.title}
                                </h1>
                                <p className="text-xl md:text-2xl mb-8 animate-fade-in-delay">
                                    {slide.subtitle}
                                </p>
                                {slide.linkUrl && (
                                    <Link
                                        href={slide.linkUrl}
                                        className="inline-block px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-all duration-200 animate-fade-in-delay"
                                    >
                                        {slide.buttonText}
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Navigation Arrows */}
            <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-3 rounded-full transition-all duration-200 z-10"
                aria-label="Previous slide"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
            </button>
            <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-3 rounded-full transition-all duration-200 z-10"
                aria-label="Next slide"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>

            {/* Dots Indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {slides.map((slide, index) => (
                    <button
                        key={slide.id}
                        onClick={() => goToSlide(index)}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentSlide
                            ? 'bg-white w-8'
                            : 'bg-white/50 hover:bg-white/75'
                            }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
