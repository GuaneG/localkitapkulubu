import { LoginForm } from "../login-form";
import { AdminPageHeader } from "../components/admin-page-header";
import styles from "../admin.module.css";
export default function LoginPage() { return <div className={styles.login}><AdminPageHeader title="Yönetici girişi" /><LoginForm /></div>; }
