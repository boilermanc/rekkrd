import React from 'react';
import { Link } from 'react-router-dom';
import SellrLayout from '../components/SellrLayout';
import { useSellrMeta } from '../hooks/useSellrMeta';

const NotFoundPage: React.FC = () => {
  useSellrMeta({
    title: 'Page Not Found',
    description: 'The page you are looking for does not exist or has expired.',
  });

  return (
    <SellrLayout>
      <div className="flex flex-col items-center justify-center text-center max-w-lg mx-auto py-24 md:py-32">
        <h1 className="font-display text-8xl text-sellr-blue leading-none">
          404
        </h1>
        <h2 className="mt-4 font-display text-2xl md:text-3xl text-sellr-charcoal">
          This record is missing from the collection.
        </h2>
        <p className="mt-3 text-sellr-charcoal/60">
          The page you're looking for doesn't exist or has expired.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <Link
            to="/sellr"
            className="px-6 py-3 min-h-[44px] bg-sellr-amber text-white font-medium rounded hover:bg-sellr-amber-light transition-colors"
          >
            Start an Appraisal
          </Link>
          <Link
            to="/"
            className="px-6 py-3 min-h-[44px] border border-sellr-charcoal/20 text-sellr-charcoal font-medium rounded hover:bg-sellr-surface transition-colors"
          >
            Go to Rekkrd
          </Link>
        </div>
      </div>
    </SellrLayout>
  );
};

export default NotFoundPage;
