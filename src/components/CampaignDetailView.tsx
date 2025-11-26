import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Users, Clock, Target } from 'lucide-react';

interface CampaignDetailProps {
  campaign: {
    date?: string;
    vertical?: string;
    hook?: string;
    pushCopy?: string;
    userSegment?: string;
    productIds?: string[];
    scheduledTime?: string;
    promoCode?: string;
    discount?: string;
    contactNumber?: string;
    appLink?: string;
    webLink?: string;
    trackingLinks?: string[];
    campaignPlatform?: string;
    personalizationTokens?: string[];
  };
}

export function CampaignDetailView({ campaign }: CampaignDetailProps) {
  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-semibold mb-1">Date</h3>
          <p className="text-sm">{campaign.date || 'N/A'}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-1">Vertical</h3>
          <Badge variant="outline">{campaign.vertical || 'Unknown'}</Badge>
        </div>
      </div>

      <Separator />

      {/* Content */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Hook</h3>
        <p className="text-sm bg-muted p-3 rounded">{campaign.hook || 'N/A'}</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Push Copy</h3>
        <p className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
          {campaign.pushCopy || 'N/A'}
        </p>
      </div>

      <Separator />

      {/* User Segment */}
      {campaign.userSegment && (
        <div className="flex items-start gap-2">
          <Users className="h-4 w-4 mt-1 text-muted-foreground" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold mb-1">Target Audience</h3>
            <p className="text-sm text-muted-foreground">{campaign.userSegment}</p>
          </div>
        </div>
      )}

      {/* Scheduled Time */}
      {campaign.scheduledTime && (
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold mb-1">Scheduled Time</h3>
            <p className="text-sm text-muted-foreground">{campaign.scheduledTime}</p>
          </div>
        </div>
      )}

      <Separator />

      {/* Offer Details */}
      <div className="grid grid-cols-2 gap-4">
        {campaign.discount && (
          <div>
            <h3 className="text-sm font-semibold mb-1">Discount</h3>
            <Badge variant="default">{campaign.discount}</Badge>
          </div>
        )}
        {campaign.promoCode && (
          <div>
            <h3 className="text-sm font-semibold mb-1">Promo Code</h3>
            <Badge variant="secondary">{campaign.promoCode}</Badge>
          </div>
        )}
      </div>

      {campaign.contactNumber && (
        <div>
          <h3 className="text-sm font-semibold mb-1">Contact Number</h3>
          <p className="text-sm font-mono">{campaign.contactNumber}</p>
        </div>
      )}

      {/* Product IDs */}
      {campaign.productIds && campaign.productIds.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Product IDs</h3>
          <div className="flex flex-wrap gap-1">
            {campaign.productIds.slice(0, 10).map((id, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {id}
              </Badge>
            ))}
            {campaign.productIds.length > 10 && (
              <Badge variant="outline" className="text-xs">
                +{campaign.productIds.length - 10} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Personalization Tokens */}
      {campaign.personalizationTokens && campaign.personalizationTokens.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Personalization Tokens</h3>
          <div className="flex flex-wrap gap-1">
            {campaign.personalizationTokens.map((token, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs font-mono">
                {`{{${token}}}`}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Links */}
      <div className="space-y-2">
        {campaign.appLink && (
          <div>
            <h3 className="text-sm font-semibold mb-1">App Link</h3>
            <a
              href={campaign.appLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              {campaign.appLink.substring(0, 50)}...
            </a>
          </div>
        )}
        {campaign.webLink && (
          <div>
            <h3 className="text-sm font-semibold mb-1">Web Link</h3>
            <a
              href={campaign.webLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              {campaign.webLink.substring(0, 50)}...
            </a>
          </div>
        )}
      </div>

      {/* Campaign Platform */}
      {campaign.campaignPlatform && (
        <div className="flex items-start gap-2">
          <Target className="h-4 w-4 mt-1 text-muted-foreground" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold mb-1">Campaign Platform</h3>
            <Badge variant="default">{campaign.campaignPlatform}</Badge>
          </div>
        </div>
      )}

      {/* Tracking Links */}
      {campaign.trackingLinks && campaign.trackingLinks.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">
            Tracking Links ({campaign.trackingLinks.length})
          </h3>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {campaign.trackingLinks.map((link, idx) => (
              <a
                key={idx}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 truncate"
              >
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{link}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

