'use client';

import { IncidentDetails as IncidentDetailsType } from '@/lib/types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { CalendarIcon, MapPinIcon, NewspaperIcon, TagIcon } from '@heroicons/react/24/outline';

interface IncidentDetailsProps {
  incident: IncidentDetailsType | null;
  onClose: () => void;
}

export default function IncidentDetails({ incident, onClose }: IncidentDetailsProps) {
  if (!incident) return null;

  return (
    <div className="fixed left-4 top-24 w-96 bg-white rounded-lg shadow-xl h-[calc(100vh-120px)] flex flex-col z-50">
      {/* Header - Fixed */}
      <div className="p-4 border-b border-gray-200 bg-white rounded-t-lg">
        <div className="flex justify-between items-start">
          <h2 className="text-lg font-bold pr-8 line-clamp-2">{incident.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Date and Time */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CalendarIcon className="h-4 w-4 flex-shrink-0" />
          <div className="flex flex-wrap gap-1">
            <span>{new Date(incident.publishedDate || '').toLocaleDateString()}</span>
            {incident.date_time && (
              <span>• {incident.date_time}</span>
            )}
            {incident.dayOfWeek && (
              <span>• {incident.dayOfWeek}</span>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="flex items-start gap-2">
          <MapPinIcon className="h-4 w-4 flex-shrink-0 mt-1 text-gray-600" />
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Location</h3>
            <p className="text-sm text-gray-600">{incident.location}</p>
          </div>
        </div>

        {/* Type and Category */}
        <div className="flex items-start gap-2">
          <TagIcon className="h-4 w-4 flex-shrink-0 mt-1 text-gray-600" />
          <div className="flex flex-wrap gap-2">
            {incident.newsType && (
              <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-medium">
                {incident.newsType}
              </span>
            )}
            {incident.category && (
              <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-medium">
                {incident.category}
              </span>
            )}
          </div>
        </div>

        {/* Main Content Sections */}
        <div className="space-y-6 pt-2">
          {/* Description */}
          {incident.description && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <NewspaperIcon className="h-4 w-4 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-700">Description</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{incident.description}</p>
            </div>
          )}

          {/* Main Subject */}
          {incident.mainSubject && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Main Subject</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{incident.mainSubject}</p>
            </div>
          )}

          {/* Impact and Significance */}
          {incident.impact && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Impact & Significance</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{incident.impact}</p>
            </div>
          )}

          {/* Public Reaction */}
          {incident.publicReaction && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Public Reaction</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{incident.publicReaction}</p>
            </div>
          )}

          {/* Past Events */}
          {incident.pastEvents && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Related Past Events</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{incident.pastEvents}</p>
            </div>
          )}

          {/* Future Implications */}
          {incident.futureImplications && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Future Implications</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{incident.futureImplications}</p>
            </div>
          )}

          {/* Quotes */}
          {incident.quotes && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Quotes</h3>
              <p className="text-sm text-gray-600 italic leading-relaxed">{incident.quotes}</p>
            </div>
          )}

          {/* Keywords */}
          {incident.keywords && incident.keywords.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">Keywords</h3>
              <div className="flex flex-wrap gap-1">
                {incident.keywords.map((keyword, i) => (
                  <span 
                    key={i}
                    className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer - Fixed */}
      {incident.source && (
        <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 rounded-b-lg">
          Source: {incident.source}
        </div>
      )}
    </div>
  );
} 