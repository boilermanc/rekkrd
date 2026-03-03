import React from 'react';
import { useNavigate } from 'react-router-dom';
import OnboardingWizard from '../../src/components/OnboardingWizard';

const OnboardingPreviewPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <OnboardingWizard
      previewMode
      onComplete={() => navigate('/admin')}
    />
  );
};

export default OnboardingPreviewPage;
