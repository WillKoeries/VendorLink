document.addEventListener('DOMContentLoaded', async () => {
  const session = requireRole([Role.ORGANIZER, Role.ADMIN]);
  if (!session) return;

  document.getElementById('footerYear').textContent = new Date().getFullYear();
  mountUserMenu(document.getElementById('topbarUserMenu'));
  document.getElementById('logoutBtn').addEventListener('click', () => signOut());

  const form = document.getElementById('createEventForm');
  const bannerFile = document.getElementById('bannerFile');
  const bannerInput = document.getElementById('bannerImageUrl');
  const bannerUrl = document.getElementById('bannerUrl');
  const uploadStatus = document.getElementById('bannerUploadStatus');
  const dropZone = document.getElementById('bannerDropZone');
  const startTime = document.getElementById('eventStartTime');
  const endTime = document.getElementById('eventEndTime');
  const tradingHours = document.getElementById('eventTime');
  let uploadingBanner = false;

  document.getElementById('eventDate').min = todayIsoDate();
  fillSelect(document.getElementById('eventProvince'), PROVINCES.map(province => ({
    value: province,
    label: province
  })), { placeholder: 'Choose a province' });
  loadCategories();

  document.getElementById('eventDate').addEventListener('change', (event) => {
    document.getElementById('eventEndDate').min = event.target.value;
  });

  [startTime, endTime].forEach(input => input.addEventListener('change', syncTradingHours));

  bannerUrl.addEventListener('input', () => {
    bannerInput.value = bannerUrl.value.trim();
    showBannerPreview(bannerInput.value);
  });

  bannerFile.addEventListener('change', () => {
    if (bannerFile.files?.[0]) uploadBanner(bannerFile.files[0]);
  });
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('is-dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('is-dragover'));
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('is-dragover');
    const file = event.dataTransfer?.files?.[0];
    if (file) uploadBanner(file);
  });

  document.getElementById('removeBannerBtn').addEventListener('click', () => {
    bannerInput.value = '';
    bannerUrl.value = '';
    bannerFile.value = '';
    showBannerPreview('');
    uploadStatus.textContent = 'No banner selected. You can add one now or later.';
  });

  form.addEventListener('input', () => clearFieldErrors(form));
  form.addEventListener('submit', submitCreateEvent);

  async function loadCategories() {
    try {
      const categories = await getCategories();
      fillSelect(document.getElementById('eventCategory'), categories.map(category => ({
        value: String(category.id), label: category.name
      })), { placeholder: 'Choose a category' });
    } catch (error) {
      fillSelect(document.getElementById('eventCategory'), [], { placeholder: 'No categories available' });
    }
  }

  function syncTradingHours() {
    tradingHours.value = startTime.value && endTime.value
      ? `${startTime.value} – ${endTime.value}`
      : '';
  }

  async function uploadBanner(file) {
    if (uploadingBanner) return;
    if (!file.type?.startsWith('image/')) {
      uploadStatus.textContent = 'Choose an image file (PNG, JPG, WebP or GIF).';
      showToast('Choose a supported image file.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      uploadStatus.textContent = 'This image is larger than 5 MB. Choose a smaller file.';
      showToast('Banner image must be 5 MB or smaller.', 'error');
      return;
    }

    uploadingBanner = true;
    uploadStatus.textContent = 'Uploading banner…';
    try {
      const result = await uploadEventImage(file);
      const url = result.bannerImageUrl || result.imageUrl;
      bannerInput.value = url;
      bannerUrl.value = url;
      showBannerPreview(url);
      uploadStatus.textContent = 'Banner uploaded. Its URL will be saved with the event.';
    } catch (error) {
      uploadStatus.textContent = error.message || 'The banner upload failed. Try again or paste an image URL.';
      showToast(uploadStatus.textContent, 'error');
    } finally {
      uploadingBanner = false;
    }
  }

  function showBannerPreview(url) {
    const safe = safeUrl(url);
    const box = document.getElementById('bannerPreviewBox');
    const prompt = document.getElementById('bannerUploadPrompt');
    const image = document.getElementById('bannerPreview');
    if (!safe) {
      image.removeAttribute('src');
      box.hidden = true;
      prompt.hidden = false;
      return;
    }
    image.src = safe;
    box.hidden = false;
    prompt.hidden = true;
  }

  async function submitCreateEvent(event) {
    event.preventDefault();
    if (uploadingBanner) {
      showToast('Wait for the banner upload to finish before creating the event.', 'info');
      return;
    }
    const alert = document.getElementById('createEventAlert');
    const button = document.getElementById('createEventSubmit');
    alert.hidden = true;

    const data = Object.fromEntries(new FormData(form).entries());
    if ((startTime.value && !endTime.value) || (!startTime.value && endTime.value)) {
      showFieldErrors(form, { time: 'Choose both a start and end time, or leave both blank.' });
      return;
    }
    const errors = validateEventData(data);
    if (Object.keys(errors).length) {
      showFieldErrors(form, errors);
      return;
    }

    clearFieldErrors(form);
    setButtonLoading(button, true, 'Creating event…');
    try {
      const created = await createEvent(data);
      form.hidden = true;
      document.querySelector('.create-event-intro').hidden = true;
      document.getElementById('createEventSuccessText').textContent = `“${created.title}” is ${created.status === EventStatus.OPEN ? 'published and accepting applications' : 'saved as a draft'}.`;
      document.getElementById('createEventSuccess').hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      if (error.fieldErrors) showFieldErrors(form, error.fieldErrors);
      else {
        alert.textContent = error.message || 'Could not create the event. Please try again.';
        alert.hidden = false;
        alert.focus();
      }
    } finally {
      setButtonLoading(button, false);
    }
  }
});

function todayIsoDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
