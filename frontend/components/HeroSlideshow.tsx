'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const heroImages = [
    {
        src: '/images/hero-1.jpg',
        alt: 'Fresh Traditional Foods',
        title: 'Authentic Traditional Delicacies',
        subtitle: 'Delivered Fresh to Your Doorstep'
    },
    {
        src: '/images/hero-2.jpg',
        alt: 'Quality Ingredients',
        title: 'Premium Quality Ingredients',
        subtitle: 'Sourced from Trusted Vendors'
    },
    {
        src: '/images/hero-3.jpg',
        alt: 'Fast Delivery',
        title: 'Fast & Reliable Delivery',
        subtitle: 'Order Today, Enjoy Tomorrow'
    }
];

export function HeroSlideshow() {
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % heroImages.length);
        }, 5000); // Change slide every 5 seconds

        return () => clearInterval(interval);
    }, []);

    const goToSlide = (index: number) => {
        setCurrentSlide(index);
    };

    const goToPrevious = () => {
        setCurrentSlide((prev) => (prev - 1 + heroImages.length) % heroImages.length);
    };

    const goToNext = () => {
        setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    };

    return (
        <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden bg-muted">
            {/* Slides */}
            <div className="relative w-full h-full">
                {heroImages.map((image, index) => (
                    <div
                        key={index}
                        className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'
                            }`}
                    >
                        <Image
                            src={image.src}
                            alt={image.alt}
                            fill
                            className="object-cover"
                            priority={index === 0}
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="text-center text-white px-4">
                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 animate-fade-in">
                                    {image.title}
                                </h1>
                                <p className="text-xl md:text-2xl animate-fade-in-delay">
                                    {image.subtitle}
                                </p>
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
                    <path strokeLinecap="round" strokeLinejoin="width" strokeWidth={2} d="M15 19l-7-7 7-7" />
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
                {heroImages.map((_, index) => (
                    <button
                        key={index}
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
