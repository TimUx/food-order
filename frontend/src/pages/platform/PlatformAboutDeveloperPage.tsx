import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Link,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import LanguageIcon from '@mui/icons-material/Language';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import WorkIcon from '@mui/icons-material/Work';
import { PlatformPublicLayout } from '@/components/PlatformPublicLayout';
import { BrandingHead } from '@/components/BrandingHead';
import { MarketingSection } from '@/components/marketing/MarketingLayout';
import {
  DEVELOPER_PROFILE,
  DEVELOPER_PROJECTS,
  DEVELOPER_TRAITS,
  FIRE_DEPARTMENT_ROLES,
} from '@/content/developerProfile';

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="h5" fontWeight={800} gutterBottom sx={{ mt: 1 }}>
      {children}
    </Typography>
  );
}

export function PlatformAboutDeveloperPage() {
  const highlighted = DEVELOPER_PROJECTS.filter((p) => p.highlight);
  const otherProjects = DEVELOPER_PROJECTS.filter((p) => !p.highlight);

  return (
    <PlatformPublicLayout>
      <BrandingHead
        titleSuffix="Über den Entwickler"
        description="Timo Braun – Fachinformatiker, Feuerwehrmann und Entwickler von FestSchmiede. Open Source aus Leidenschaft und Ehrenamt."
        path="/ueber-den-entwickler"
      />

      <MarketingSection
        title="Über den Entwickler"
        subtitle={`${DEVELOPER_PROFILE.name} – ${DEVELOPER_PROFILE.tagline}`}
      >
        <Stack spacing={4} sx={{ maxWidth: 900 }}>
          <Typography sx={{ lineHeight: 1.8, fontSize: '1.05rem' }}>
            FestSchmiede wird von <strong>{DEVELOPER_PROFILE.name}</strong> entwickelt – aus der Praxis für
            Vereine und ehrenamtliche Veranstalter. Timo verbindet jahrelange Erfahrung in der IT mit
            aktivem Engagement in der Freiwilligen Feuerwehr und einem Faible für Open Source. Die Idee
            zum Projekt entstand, weil bei Festen und Veranstaltungen oft eine einfache, digitale Lösung
            fehlte, die zu den Abläufen im Ehrenamt passt.
          </Typography>

          <Box>
            <SectionHeading>Wer ich bin</SectionHeading>
            <Typography sx={{ lineHeight: 1.8 }}>
              Timo ist 45 Jahre alt und wohnhaft in {DEVELOPER_PROFILE.location} – ländliche Idylle
              trifft auf technikverliebten Bastlergeist. Privat: Ehemann, Hundepapa zweier Bearded Collies
              und jemand, der neben dem Beruf ständig an der nächsten Idee baut – ob Smart Home,
              Automatisierung, 3D-Druck oder selbst geschriebene Software.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
              {DEVELOPER_TRAITS.map((trait) => (
                <Chip key={trait} label={trait} size="small" variant="outlined" />
              ))}
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <WorkIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>
                      Beruf – Hobby trifft Karriere
                    </Typography>
                  </Stack>
                  <Typography sx={{ lineHeight: 1.8 }}>
                    Seit vielen Jahren arbeitet Timo als <strong>Fachinformatiker für Systemintegration</strong>{' '}
                    mit Schwerpunkt auf <strong>Storage-Administration &amp; Architektur</strong>. RAID, SAN,
                    Backup, große Storage-Cluster und komplexe Migrationsprojekte gehören zum Alltag – ebenso
                    wie der Blick dafür, Systeme zuverlässig, sicher und wartbar zu betreiben. Diese
                    Erfahrung fließt direkt in FestSchmiede ein: Docker, Backups, Updates und ein Setup,
                    das auch ohne großes IT-Team funktioniert.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <VolunteerActivismIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>
                      Ehrenamt – Feuerwehr im Herzen
                    </Typography>
                  </Stack>
                  <Typography sx={{ lineHeight: 1.8, mb: 2 }}>
                    Timo ist aktives Mitglied der <strong>Freiwilligen Feuerwehr Willingshausen</strong>.
                    Dort, wo es piept, funkt oder blinkt, hat er oft mitzuwirken – und genau aus dieser
                    Praxis heraus sind viele seiner Software-Projekte entstanden.
                  </Typography>
                  <List dense disablePadding>
                    {FIRE_DEPARTMENT_ROLES.map((role) => (
                      <ListItem key={role} disableGutters sx={{ py: 0.25 }}>
                        <ListItemText primary={`• ${role}`} primaryTypographyProps={{ variant: 'body2' }} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Box>
            <SectionHeading>Warum FestSchmiede?</SectionHeading>
            <Typography sx={{ lineHeight: 1.8 }}>
              Das Ziel ist kein anonymes Produkt, sondern ein Beitrag zur Digitalisierung des Ehrenamts –
              pragmatisch, verständlich und ohne unnötigen Schnickschnack. Vereine sollen weniger Zeit mit
              Zettelwirtschaft und manueller Koordination verbringen und mehr Zeit für das haben, was wirklich
              zählt: das Fest selbst. FestSchmiede ist Open Source, damit Organisationen unabhängig bleiben,
              mitlesen können und bei Bedarf selbst hosten.
            </Typography>
          </Box>

          <Box>
            <SectionHeading>Open-Source-Projekte</SectionHeading>
            <Typography color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
              Neben FestSchmiede entwickelt Timo auf{' '}
              <Link href={DEVELOPER_PROFILE.github} target="_blank" rel="noopener noreferrer">
                GitHub
              </Link>{' '}
              weitere Tools – viele davon aus dem Feuerwehr- und Vereinsumfeld. Eine Auswahl:
            </Typography>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              {highlighted.map((project) => (
                <Grid key={project.name} size={{ xs: 12, md: 6 }}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: '100%',
                      borderColor: 'primary.main',
                      borderWidth: 2,
                    }}
                  >
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                        <Typography variant="h6" fontWeight={700}>
                          {project.name}
                        </Typography>
                        {project.language && (
                          <Chip label={project.language} size="small" color="primary" variant="outlined" />
                        )}
                      </Stack>
                      <Typography color="text.secondary" sx={{ mt: 1, mb: 2, lineHeight: 1.6 }}>
                        {project.description}
                      </Typography>
                      <Link href={project.url} target="_blank" rel="noopener noreferrer" underline="hover">
                        Auf GitHub ansehen →
                      </Link>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={2}>
              {otherProjects.map((project) => (
                <Grid key={project.name} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                        <Typography fontWeight={700}>{project.name}</Typography>
                        {project.language && (
                          <Chip label={project.language} size="small" variant="outlined" />
                        )}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 1.5, lineHeight: 1.6 }}>
                        {project.description}
                      </Typography>
                      <Link
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="body2"
                        underline="hover"
                      >
                        GitHub →
                      </Link>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Alle öffentlichen Repositories finden Sie im{' '}
              <Link href={DEVELOPER_PROFILE.github} target="_blank" rel="noopener noreferrer">
                GitHub-Profil @TimUx
              </Link>
              .
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              component="a"
              href={DEVELOPER_PROFILE.personalPage}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              startIcon={<LanguageIcon />}
            >
              Mehr auf timobraun.de
            </Button>
            <Button
              component="a"
              href={DEVELOPER_PROFILE.github}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              startIcon={<GitHubIcon />}
            >
              GitHub-Profil @TimUx
            </Button>
          </Stack>
        </Stack>
      </MarketingSection>
    </PlatformPublicLayout>
  );
}
