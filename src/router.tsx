import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './app/AppLayout';
import { MarketRadarRoute } from './app/routes/MarketRadar';
import { SegmentStudioRoute } from './app/routes/SegmentStudio';
import { CampaignDesignerRoute } from './app/routes/CampaignDesigner';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/market-radar" replace /> },
      { path: '/market-radar', element: <MarketRadarRoute /> },
      { path: '/segment-studio', element: <SegmentStudioRoute /> },
      { path: '/campaign-designer', element: <CampaignDesignerRoute /> }
    ]
  }
]);
