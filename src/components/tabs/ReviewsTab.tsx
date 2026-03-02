import React, { useState } from 'react';
import { Employee } from '../../types';
import { MessageSquare, Star, User, Building } from 'lucide-react';

interface ReviewsTabProps {
  employee: Employee;
}

const ReviewsTab: React.FC<ReviewsTabProps> = ({ employee }) => {
  const [activeReviewType, setActiveReviewType] = useState<'internal' | 'external'>('internal');

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <MessageSquare className="w-6 h-6 text-blue-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-900">Reviews</h2>
      </div>
      
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg inline-flex">
        <button
          onClick={() => setActiveReviewType('internal')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeReviewType === 'internal'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <User className="w-4 h-4 inline mr-2" />
          Internal Reviews
        </button>
        <button
          onClick={() => setActiveReviewType('external')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeReviewType === 'external'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Building className="w-4 h-4 inline mr-2" />
          External Reviews
        </button>
      </div>
      
      <div className="space-y-4">
        {activeReviewType === 'internal' && (
          <>
            {employee.reviews.internal.map((review) => (
              <div key={review.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{review.reviewer}</h3>
                    <div className="flex items-center mt-1">
                      {renderStars(review.rating)}
                      <span className="ml-2 text-sm text-gray-600">{review.rating}/5</span>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(review.date).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-700">{review.feedback}</p>
              </div>
            ))}
            {employee.reviews.internal.length === 0 && (
              <div className="text-center py-12">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No internal reviews yet</p>
              </div>
            )}
          </>
        )}
        
        {activeReviewType === 'external' && (
          <>
            {employee.reviews.external.map((review) => (
              <div key={review.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{review.client}</h3>
                    <p className="text-sm text-gray-600">{review.project}</p>
                    <div className="flex items-center mt-1">
                      {renderStars(review.rating)}
                      <span className="ml-2 text-sm text-gray-600">{review.rating}/5</span>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(review.date).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-700">{review.feedback}</p>
              </div>
            ))}
            {employee.reviews.external.length === 0 && (
              <div className="text-center py-12">
                <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No external reviews yet</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReviewsTab;