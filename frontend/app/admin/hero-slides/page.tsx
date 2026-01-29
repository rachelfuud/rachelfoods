'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Image from 'next/image';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface HeroSlide {
    id: string;
    title: string;
    subtitle: string;
    imageUrl: string;
    linkUrl?: string;
    buttonText: string;
    order: number;
    isActive: boolean;
}

export default function AdminHeroSlidesPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [slides, setSlides] = useState<HeroSlide[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        imageUrl: '',
        linkUrl: '/catalog',
        buttonText: 'Shop Now',
        order: 0,
        isActive: true,
    });

    useEffect(() => {
        if (!user || user.role !== 'ADMIN') {
            router.push('/admin/login');
            return;
        }
        fetchSlides();
    }, [user, router]);

    async function fetchSlides() {
        try {
            const data = await api.get('/api/admin/hero-slides');
            setSlides(data.sort((a: HeroSlide, b: HeroSlide) => a.order - b.order));
        } catch (error) {
            console.error('Failed to fetch slides:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        try {
            if (editingSlide) {
                await api.put(`/api/admin/hero-slides/${editingSlide.id}`, formData);
            } else {
                await api.post('/api/admin/hero-slides', formData);
            }

            resetForm();
            fetchSlides();
        } catch (error) {
            console.error('Failed to save slide:', error);
            alert('Failed to save slide. Please try again.');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this slide?')) return;

        try {
            await api.delete(`/api/admin/hero-slides/${id}`);
            fetchSlides();
        } catch (error) {
            console.error('Failed to delete slide:', error);
            alert('Failed to delete slide. Please try again.');
        }
    }

    function handleEdit(slide: HeroSlide) {
        setEditingSlide(slide);
        setFormData({
            title: slide.title,
            subtitle: slide.subtitle,
            imageUrl: slide.imageUrl,
            linkUrl: slide.linkUrl || '/catalog',
            buttonText: slide.buttonText,
            order: slide.order,
            isActive: slide.isActive,
        });
    }

    function resetForm() {
        setEditingSlide(null);
        setFormData({
            title: '',
            subtitle: '',
            imageUrl: '',
            linkUrl: '/catalog',
            buttonText: 'Shop Now',
            order: slides.length,
            isActive: true,
        });
    }

    async function moveSlide(index: number, direction: 'up' | 'down') {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === slides.length - 1)
        ) {
            return;
        }

        const newSlides = [...slides];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newSlides[index], newSlides[targetIndex]] = [newSlides[targetIndex], newSlides[index]];

        newSlides.forEach((slide, idx) => {
            slide.order = idx;
        });

        setSlides(newSlides);

        try {
            await api.post('/api/admin/hero-slides/reorder', {
                slideIds: newSlides.map(s => s.id),
            });
        } catch (error) {
            console.error('Failed to reorder slides:', error);
            fetchSlides(); // Revert on error
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner size="lg" text="Loading slides..." centered />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">Manage Hero Slideshow</h1>
                <button
                    onClick={() => router.push('/admin')}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                    Back to Admin
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">
                        {editingSlide ? 'Edit Slide' : 'Add New Slide'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Title *</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Subtitle *</label>
                            <input
                                type="text"
                                value={formData.subtitle}
                                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Image URL *</label>
                            <input
                                type="text"
                                value={formData.imageUrl}
                                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary-500"
                                placeholder="/images/hero-1.jpg"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Place image in /frontend/public/images/ folder
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Button Text</label>
                            <input
                                type="text"
                                value={formData.buttonText}
                                onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Link URL</label>
                            <input
                                type="text"
                                value={formData.linkUrl}
                                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary-500"
                                placeholder="/catalog"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="w-4 h-4"
                            />
                            <label htmlFor="isActive" className="text-sm font-medium">
                                Active (show on homepage)
                            </label>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="submit"
                                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                            >
                                {editingSlide ? 'Update Slide' : 'Create Slide'}
                            </button>
                            {editingSlide && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Slides List */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Current Slides ({slides.length})</h2>

                    {slides.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                            No slides yet. Create your first slide!
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {slides.map((slide, index) => (
                                <div
                                    key={slide.id}
                                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex gap-4">
                                        <div className="relative w-32 h-20 shrink-0 rounded overflow-hidden">
                                            <Image
                                                src={slide.imageUrl}
                                                alt={slide.title}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold truncate">{slide.title}</h3>
                                            <p className="text-sm text-gray-600 truncate">{slide.subtitle}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`text-xs px-2 py-1 rounded ${slide.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                    {slide.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                                <span className="text-xs text-gray-500">Order: {slide.order}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={() => moveSlide(index, 'up')}
                                                disabled={index === 0}
                                                className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                                                title="Move up"
                                            >
                                                ↑
                                            </button>
                                            <button
                                                onClick={() => moveSlide(index, 'down')}
                                                disabled={index === slides.length - 1}
                                                className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                                                title="Move down"
                                            >
                                                ↓
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={() => handleEdit(slide)}
                                            className="flex-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(slide.id)}
                                            className="flex-1 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Preview Section */}
            <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Live Preview</h2>
                <div className="relative w-full h-75 rounded-lg overflow-hidden">
                    {slides.filter(s => s.isActive).length > 0 ? (
                        <div className="relative w-full h-full">
                            <Image
                                src={slides.filter(s => s.isActive)[0].imageUrl}
                                alt={slides.filter(s => s.isActive)[0].title}
                                fill
                                className="object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <div className="text-center text-white px-4">
                                    <h1 className="text-3xl font-bold mb-2">
                                        {slides.filter(s => s.isActive)[0].title}
                                    </h1>
                                    <p className="text-lg">
                                        {slides.filter(s => s.isActive)[0].subtitle}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full bg-gray-100">
                            <p className="text-gray-500">No active slides to preview</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
